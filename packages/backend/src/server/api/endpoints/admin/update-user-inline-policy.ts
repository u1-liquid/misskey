/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { MiInlinePolicy } from "@/models/InlinePolicy.js";

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
		inlinePolicies: {
			type: 'array',
			nullable: false, optional: false,
			items: {
				type: 'object',
				oneOf: [
					{
						type: 'object',
						nullable: false, optional: false,
						properties: {
							type: {
								type: 'string',
								nullable: false, optional: false,
								enum: ['override'],
							},
							kind: {
								type: 'string',
								nullable: false, optional: false,
							},
							value: {
								type: 'object',
								oneOf: [
									{
										type: 'boolean',
										nullable: false, optional: false,
									},
									{
										type: 'number',
										nullable: false, optional: false,
									},
									{
										type: 'string',
										nullable: false, optional: false,
									},
								],
							},
							reason: {
								type: 'string',
								nullable: true, optional: true,
							},
							createdAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
							expiresAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
						},
					},
					{
						type: 'object',
						nullable: false, optional: false,
						properties: {
							type: {
								type: 'string',
								nullable: false, optional: false,
								enum: ['add', 'multiply'],
							},
							kind: {
								type: 'string',
								nullable: false, optional: false,
							},
							value: {
								type: 'number',
								nullable: false, optional: false,
							},
							reason: {
								type: 'string',
								nullable: true, optional: true,
							},
							createdAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
							expiresAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
						},
					},
					{
						type: 'object',
						nullable: false, optional: false,
						properties: {
							type: {
								type: 'string',
								nullable: false, optional: false,
								enum: ['grant', 'revoke'],
							},
							scope: {
								type: 'string',
								nullable: false, optional: false,
							},
							target: {
								type: 'string',
								nullable: false, optional: false,
							},
							reason: {
								type: 'string',
								nullable: true, optional: true,
							},
							createdAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
							expiresAt: {
								type: 'string',
								nullable: true, optional: true,
								format: 'date-time',
							},
						},
					},
				],
			},
		},
	},
	required: ['userId', 'inlinePolicies'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({ id: ps.userId });

			if (user == null) {
				throw new Error('user not found');
			}

			const policies: MiInlinePolicy[] = [];
			for (const policy of ps.inlinePolicies) {
				if (policy.type === 'override') {
					policies.push({
						type: policy.type,
						kind: policy.kind,
						value: policy.value,
						reason: policy.reason,
						createdAt: policy.createdAt,
						expiresAt: policy.expiresAt,
					});
				} else if (policy.type === 'add' || policy.type === 'multiply') {
					policies.push({
						type: policy.type,
						kind: policy.kind,
						value: policy.value,
						reason: policy.reason,
						createdAt: policy.createdAt,
						expiresAt: policy.expiresAt,
					});
				} else if (policy.type === 'grant' || policy.type === 'revoke') {
					policies.push({
						type: policy.type,
						scope: policy.scope,
						target: policy.target,
						reason: policy.reason,
						createdAt: policy.createdAt,
						expiresAt: policy.expiresAt,
					});
				}
			}

			await this.usersRepository.update({ id: user.id }, {
				inlinePolicies: ps.inlinePolicies,
			});

			this.moderationLogService.log(me, 'updateUserInlinePolicies', {
				userId: user.id,
				userUsername: user.username,
				userHost: user.host,
				before: user.inlinePolicies,
				after: ps.inlinePolicies,
			});
		});
	}
}
