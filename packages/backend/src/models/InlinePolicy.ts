/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type MiInlinePolicy = {
	type: 'override' | 'add' | 'multiply' | 'grant' | 'revoke';
	reason?: string;
	createdAt?: Date;
	expiresAt?: Date | null;
} & (
	{
			type: 'override';
			kind: string;
			value: boolean | number | string;
	} | {
			type: 'add' | 'multiply';
			kind: string;
			value: number;
	} | {
			type: 'grant' | 'revoke';
			scope: string;
			target: string;
	}
);
