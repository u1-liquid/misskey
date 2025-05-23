/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import type { Packed } from '@/misc/json-schema.js';
import { MetaService } from '@/core/MetaService.js';
import { RoleService } from '@/core/RoleService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { isRenotePacked, isQuotePacked } from '@/misc/is-renote.js';
import Channel, { type MiChannelService } from '../channel.js';

class GlobalTimelineChannel extends Channel {
	public readonly chName = 'globalTimeline';
	public static readonly shouldShare = false;
	public static readonly requireCredential = false as const;
	private withRenotes: boolean;
	private withFiles: boolean;
	private minimize: boolean;

	constructor(
		private metaService: MetaService,
		private roleService: RoleService,
		private noteEntityService: NoteEntityService,

		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: any) {
		const policies = await this.roleService.getUserPolicies(this.user ? this.user.id : null);
		if (!policies.gtlAvailable) return;

		this.withRenotes = params.withRenotes ?? true;
		this.withFiles = params.withFiles ?? false;
		this.minimize = params.minimize ?? false;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		if (note.visibility !== 'public') return;
		if (note.channelId != null) return;

		// ファイルを含まない投稿は除外
		if (this.withFiles && (note.fileIds == null || note.fileIds.length === 0)) return;
		if (this.withFiles && (note.files === undefined || note.files.length === 0)) return;

		// 関係ない返信は除外
		if (note.reply) {
			const reply = note.reply;
			if ((this.following[note.userId]?.withReplies ?? false)) {
				// 自分のフォローしていないユーザーの visibility: followers な投稿への返信は弾く
				if (reply.visibility === 'followers' && !Object.hasOwn(this.following, reply.userId)) return;
				// 自分の見ることができないユーザーの visibility: specified な投稿への返信は弾く
				if (reply.visibility === 'specified' && !reply.visibleUserIds!.includes(this.user!.id)) return;
			} else {
				// 「チャンネル接続主への返信」でもなければ、「チャンネル接続主が行った返信」でもなければ、「投稿者の投稿者自身への返信」でもない場合
				if (reply.userId !== this.user!.id && note.userId !== this.user!.id && reply.userId !== note.userId) return;
			}
		}

		// 純粋なリノート（引用リノートでないリノート）の場合
		if (note.renote && isRenotePacked(note) && !isQuotePacked(note)) {
			if (!this.withRenotes) return;
			if (note.renote.reply) {
				const reply = note.renote.reply;
				// 自分のフォローしていないユーザーの visibility: followers な投稿への返信のリノートは弾く
				if (reply.visibility === 'followers' && !Object.hasOwn(this.following, reply.userId)) return;
			}
		}

		if (this.isNoteMutedOrBlocked(note)) return;

		if (this.user && isRenotePacked(note) && !isQuotePacked(note)) {
			if (note.renote && Object.keys(note.renote.reactions).length > 0) {
				const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
				note.renote.myReaction = myRenoteReaction;
			}
		}

		if (this.user && (note.visibleUserIds?.includes(this.user.id) ?? note.mentions?.includes(this.user.id))) {
			this.connection.cacheNote(note);
		}

		if (this.minimize && ['public', 'home'].includes(note.visibility)) {
			const badgeRoles = this.iAmModerator ? await this.roleService.getUserBadgeRoles(note.userId, false) : undefined;

			this.send('note', {
				id: note.id, myReaction: note.myReaction,
				poll: note.poll?.choices ? { choices: note.poll.choices } : undefined,
				reply: note.reply?.myReaction ? { myReaction: note.reply.myReaction } : undefined,
				renote: note.renote?.myReaction ? { myReaction: note.renote.myReaction } : undefined,
				...(badgeRoles?.length ? { user: { badgeRoles } } : {}),
			});
		} else {
			this.send('note', note);
		}
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}

@Injectable()
export class GlobalTimelineChannelService implements MiChannelService<false> {
	public readonly shouldShare = GlobalTimelineChannel.shouldShare;
	public readonly requireCredential = GlobalTimelineChannel.requireCredential;
	public readonly kind = GlobalTimelineChannel.kind;

	constructor(
		private metaService: MetaService,
		private roleService: RoleService,
		private noteEntityService: NoteEntityService,
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): GlobalTimelineChannel {
		return new GlobalTimelineChannel(
			this.metaService,
			this.roleService,
			this.noteEntityService,
			id,
			connection,
		);
	}
}
