/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import type { Packed } from '@/misc/json-schema.js';
import type { MiInstance } from '@/models/Instance.js';
import { MetaService } from '@/core/MetaService.js';
import { bindThis } from '@/decorators.js';
import { UtilityService } from '@/core/UtilityService.js';
import { RoleService } from '@/core/RoleService.js';
import { MiUser } from '@/models/User.js';

@Injectable()
export class InstanceEntityService {
	constructor(
		private metaService: MetaService,
		private roleService: RoleService,

		private utilityService: UtilityService,
	) {
	}

	@bindThis
	public async pack(
		instance: MiInstance,
		me: { id: MiUser['id']; } | null | undefined,
	): Promise<Packed<'FederationInstance'>> {
		const meta = await this.metaService.fetch();
		const iAmModerator = me ? await this.roleService.isModerator(me as MiUser) : false;

		return {
			id: instance.id,
			firstRetrievedAt: instance.firstRetrievedAt.toISOString(),
			host: instance.host,
			usersCount: instance.usersCount,
			notesCount: instance.notesCount,
			followingCount: instance.followingCount,
			followersCount: instance.followersCount,
			isNotResponding: instance.isNotResponding,
			isSuspended: instance.isSuspended,
			isBlocked: this.utilityService.isItemListedIn(instance.host, meta.blockedHosts),
			softwareName: instance.softwareName,
			softwareVersion: instance.softwareVersion,
			openRegistrations: instance.openRegistrations,
			name: instance.name,
			description: instance.description,
			maintainerName: instance.maintainerName,
			maintainerEmail: instance.maintainerEmail,
			isSilenced: this.utilityService.isItemListedIn(instance.host, meta.silencedHosts),
			isSensitiveMedia: this.utilityService.isItemListedIn(instance.host, meta.sensitiveMediaHosts),
			iconUrl: instance.iconUrl,
			faviconUrl: instance.faviconUrl,
			themeColor: instance.themeColor,
			infoUpdatedAt: instance.infoUpdatedAt ? instance.infoUpdatedAt.toISOString() : null,
			latestRequestReceivedAt: instance.latestRequestReceivedAt ? instance.latestRequestReceivedAt.toISOString() : null,
			moderationNote: iAmModerator ? instance.moderationNote : null,
		};
	}

	@bindThis
	public async packMany(
		instances: MiInstance[],
		me: { id: MiUser['id'] } | null | undefined,
	) : Promise<Packed<'FederationInstance'>[]> {
		return (await Promise.allSettled(instances.map(x => this.pack(x, me))))
			.filter(result => result.status === 'fulfilled')
			.map(result => (result as PromiseFulfilledResult<Packed<'FederationInstance'>>).value);
	}
}
