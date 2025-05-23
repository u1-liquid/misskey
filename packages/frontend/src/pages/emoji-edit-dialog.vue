<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkWindow
	ref="windowEl"
	:initialWidth="400"
	:initialHeight="500"
	:canResize="false"
	@close="windowEl.close()"
	@closed="$emit('closed')"
>
	<template v-if="emoji" #header>:{{ emoji.name }}:</template>
	<template v-else #header>New emoji</template>

	<div>
		<MkSpacer :marginMin="20" :marginMax="28">
			<div class="_gaps_m">
				<div v-if="imgUrl != null" :class="$style.imgs">
					<div style="background: #000;" :class="$style.imgContainer">
						<img :src="imgUrl" :class="$style.img"/>
					</div>
					<div style="background: #222;" :class="$style.imgContainer">
						<img :src="imgUrl" :class="$style.img"/>
					</div>
					<div style="background: #ddd;" :class="$style.imgContainer">
						<img :src="imgUrl" :class="$style.img"/>
					</div>
					<div style="background: #fff;" :class="$style.imgContainer">
						<img :src="imgUrl" :class="$style.img"/>
					</div>
				</div>
				<MkButton rounded style="margin: 0 auto;" @click="changeImage">{{ i18n.ts.selectFile }}</MkButton>
				<MkInput v-model="name" pattern="[a-z0-9_]" autocapitalize="off">
					<template #label>{{ i18n.ts.name }}</template>
				</MkInput>
				<MkInput v-model="category" :datalist="customEmojiCategories">
					<template #label>{{ i18n.ts.category }}</template>
				</MkInput>
				<MkInput v-model="aliases" autocapitalize="off">
					<template #label>{{ i18n.ts.tags }}</template>
					<template #caption>
						{{ i18n.ts.theKeywordWhenSearchingForCustomEmoji }}<br/>
						{{ i18n.ts.setMultipleBySeparatingWithSpace }}
					</template>
				</MkInput>
				<MkTextarea v-model="license" :mfmAutocomplete="true">
					<template #label>{{ i18n.ts.license }}</template>
				</MkTextarea>
				<MkInput v-model="requestedBy" autocapitalize="off">
					<template #label>{{ i18n.ts.request }}</template>
				</MkInput>
				<MkTextarea v-model="memo" :mfmAutocomplete="true">
					<template #label>{{ i18n.ts.memo }}</template>
				</MkTextarea>
				<MkKeyValue v-if="createdAt" oneline>
					<template #key>{{ i18n.ts.createdAt }}</template>
					<template #value><span class="_monospace"><MkTime :time="createdAt" :mode="'detail'"/></span></template>
				</MkKeyValue>
				<MkKeyValue v-if="updatedAt" oneline>
					<template #key>{{ i18n.ts.updatedAt }}</template>
					<template #value><span class="_monospace"><MkTime :time="updatedAt" :mode="'detail'"/></span></template>
				</MkKeyValue>
				<MkFolder>
					<template #label>{{ i18n.ts.rolesThatCanBeUsedThisEmojiAsReaction }}</template>
					<template #suffix>{{ rolesThatCanBeUsedThisEmojiAsReaction.length === 0 ? i18n.ts.all : rolesThatCanBeUsedThisEmojiAsReaction.length }}</template>

					<div class="_gaps">
						<MkButton rounded @click="addRole(true)"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>

						<div v-for="role in rolesThatCanBeUsedThisEmojiAsReaction" :key="role.id" :class="$style.roleItem">
							<MkRolePreview :class="$style.role" :role="role" :forModeration="true" :detailed="false" style="pointer-events: none;"/>
							<button v-if="role.target === 'manual'" class="_button" :class="$style.roleUnassign" @click="removeRole(true, role, $event)"><i class="ti ti-x"></i></button>
							<button v-else class="_button" :class="$style.roleUnassign" disabled><i class="ti ti-ban"></i></button>
						</div>

						<MkInfo>{{ i18n.ts.rolesThatCanBeUsedThisEmojiAsReactionEmptyDescription }}</MkInfo>
						<MkInfo warn>{{ i18n.ts.rolesThatCanBeUsedThisEmojiAsReactionPublicRoleWarn }}</MkInfo>
					</div>
				</MkFolder>
				<MkFolder>
					<template #label>{{ i18n.ts.rolesThatCanNotBeUsedThisEmojiAsReaction }}</template>
					<template #suffix>{{ rolesThatCanNotBeUsedThisEmojiAsReaction.length === 0 ? i18n.ts.none : rolesThatCanNotBeUsedThisEmojiAsReaction.length }}</template>

					<div class="_gaps">
						<MkButton rounded @click="addRole(false)"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>

						<div v-for="role in rolesThatCanNotBeUsedThisEmojiAsReaction" :key="role.id" :class="$style.roleItem">
							<MkRolePreview :class="$style.role" :role="role" :forModeration="true" :detailed="false" style="pointer-events: none;"/>
							<button v-if="role.target === 'manual'" class="_button" :class="$style.roleUnassign" @click="removeRole(false, role, $event)"><i class="ti ti-x"></i></button>
							<button v-else class="_button" :class="$style.roleUnassign" disabled><i class="ti ti-ban"></i></button>
						</div>

						<MkInfo>{{ i18n.ts.rolesThatCanBeUsedThisEmojiAsReactionEmptyDescription }}</MkInfo>
						<MkInfo warn>{{ i18n.ts.rolesThatCanBeUsedThisEmojiAsReactionPublicRoleWarn }}</MkInfo>
					</div>
				</MkFolder>
				<MkSwitch v-model="isSensitive">isSensitive</MkSwitch>
				<MkSwitch v-model="localOnly">{{ i18n.ts.localOnly }}</MkSwitch>
				<MkButton v-if="emoji" danger @click="del()"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
		</MkSpacer>
		<div :class="$style.footer">
			<MkButton primary rounded style="margin: 0 auto;" @click="done"><i class="ti ti-check"></i> {{ props.emoji ? i18n.ts.update : i18n.ts.create }}</MkButton>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkFolder from '@/components/MkFolder.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import { customEmojiCategories } from '@/custom-emojis.js';
import MkSwitch from '@/components/MkSwitch.vue';
import { selectFile } from '@/scripts/select-file.js';
import MkRolePreview from '@/components/MkRolePreview.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';

const props = defineProps<{
	emoji?: any,
}>();

const windowEl = ref<InstanceType<typeof MkWindow> | null>(null);
const name = ref<string>(props.emoji ? props.emoji.name : '');
const category = ref<string>(props.emoji ? props.emoji.category : '');
const aliases = ref<string>(props.emoji ? props.emoji.aliases.join(' ') : '');
const createdAt = ref<string | null>(props.emoji ? props.emoji.createdAt : null);
const updatedAt = ref<string | null>(props.emoji ? props.emoji.updatedAt : null);
const license = ref<string>(props.emoji ? (props.emoji.license ?? '') : '');
const isSensitive = ref(props.emoji ? props.emoji.isSensitive : false);
const localOnly = ref(props.emoji ? props.emoji.localOnly : false);
const requestedBy = ref(props.emoji ? props.emoji.requestedBy : '');
const memo = ref(props.emoji ? props.emoji.memo : '');
const roleIdsThatCanBeUsedThisEmojiAsReaction = ref(props.emoji ? props.emoji.roleIdsThatCanBeUsedThisEmojiAsReaction : []);
const rolesThatCanBeUsedThisEmojiAsReaction = ref<Misskey.entities.Role[]>([]);
const roleIdsThatCanNotBeUsedThisEmojiAsReaction = ref(props.emoji ? props.emoji.roleIdsThatCanNotBeUsedThisEmojiAsReaction : []);
const rolesThatCanNotBeUsedThisEmojiAsReaction = ref<Misskey.entities.Role[]>([]);
const file = ref<Misskey.entities.DriveFile>();

watch(roleIdsThatCanBeUsedThisEmojiAsReaction, async () => {
	rolesThatCanBeUsedThisEmojiAsReaction.value = (await Promise.all(roleIdsThatCanBeUsedThisEmojiAsReaction.value.map((id) => misskeyApi('admin/roles/show', { roleId: id }).catch(() => null)))).filter(x => x != null);
}, { immediate: true });

watch(roleIdsThatCanNotBeUsedThisEmojiAsReaction, async () => {
	rolesThatCanNotBeUsedThisEmojiAsReaction.value = (await Promise.all(roleIdsThatCanNotBeUsedThisEmojiAsReaction.value.map((id) => misskeyApi('admin/roles/show', { roleId: id }).catch(() => null)))).filter(x => x != null);
}, { immediate: true });

const imgUrl = computed(() => file.value ? file.value.url : props.emoji ? `/emoji/${props.emoji.name}.webp` : null);

const emit = defineEmits<{
	(ev: 'done', v: { deleted?: boolean; updated?: any; created?: any }): void,
	(ev: 'closed'): void
}>();

async function changeImage(ev) {
	file.value = await selectFile(ev.currentTarget ?? ev.target, null);
	if (name.value) return;

	const candidate = file.value.name.replace(/\.(.+)$/, '');
	if (candidate.match(/^[a-z0-9_]+$/)) {
		name.value = candidate;
	}
}

async function addRole(type: boolean) {
	const roles = await misskeyApi('admin/roles/list');
	const currentRoleIds = type ? rolesThatCanBeUsedThisEmojiAsReaction.value.map(x => x.id) : rolesThatCanNotBeUsedThisEmojiAsReaction.value.map(x => x.id);

	const { canceled, result: role } = await os.select({
		items: roles.filter(r => r.isPublic).filter(r => !currentRoleIds.includes(r.id)).map(r => ({ text: r.name, value: r })),
	});
	if (canceled || role == null) return;

	if (type) rolesThatCanBeUsedThisEmojiAsReaction.value.push(role);
	else rolesThatCanNotBeUsedThisEmojiAsReaction.value.push(role);
}

async function removeRole(type: boolean, role, ev) {
	if (type) rolesThatCanBeUsedThisEmojiAsReaction.value = rolesThatCanBeUsedThisEmojiAsReaction.value.filter(x => x.id !== role.id);
	else rolesThatCanNotBeUsedThisEmojiAsReaction.value = rolesThatCanNotBeUsedThisEmojiAsReaction.value.filter(x => x.id !== role.id);
}

async function done() {
	const params = {
		name: name.value,
		category: category.value === '' ? null : category.value,
		aliases: aliases.value.split(' ').filter(x => x !== ''),
		license: license.value === '' ? null : license.value,
		isSensitive: isSensitive.value,
		localOnly: localOnly.value,
		requestedBy: requestedBy.value,
		memo: memo.value,
		roleIdsThatCanBeUsedThisEmojiAsReaction: rolesThatCanBeUsedThisEmojiAsReaction.value.map(x => x.id),
		roleIdsThatCanNotBeUsedThisEmojiAsReaction: rolesThatCanNotBeUsedThisEmojiAsReaction.value.map(x => x.id),
	};

	if (file.value) {
		params.fileId = file.value.id;
	}

	if (props.emoji) {
		await os.apiWithDialog('admin/emoji/update', {
			id: props.emoji.id,
			...params,
		});

		emit('done', {
			updated: {
				id: props.emoji.id,
				...params,
			},
		});

		windowEl.value.close();
	} else {
		const created = await os.apiWithDialog('admin/emoji/add', params);

		emit('done', {
			created: created,
		});

		windowEl.value.close();
	}
}

async function del() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.removeAreYouSure({ x: name.value }),
	});
	if (canceled) return;

	misskeyApi('admin/emoji/delete', {
		id: props.emoji.id,
	}).then(() => {
		emit('done', {
			deleted: true,
		});
		windowEl.value.close();
	});
}
</script>

<style lang="scss" module>
.imgs {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	justify-content: center;
}

.imgContainer {
	padding: 8px;
	border-radius: 6px;
}

.img {
	display: block;
	height: 64px;
	width: 64px;
	object-fit: contain;
}

.roleItem {
	display: flex;
}

.role {
	flex: 1;
}

.roleUnassign {
	width: 32px;
	height: 32px;
	margin-left: 8px;
	align-self: center;
}

.footer {
	position: sticky;
	bottom: 0;
	left: 0;
	padding: 12px;
	border-top: solid 0.5px var(--divider);
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
}
</style>
