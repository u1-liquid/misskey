<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="800"
	:height="600"
	:withOkButton="false"
	:okButtonDisabled="false"
	@close="dialog?.close()"
	@closed="$emit('closed')"
>
	<template v-if="announcement" #header>:{{ announcement.title }}:</template>
	<template v-else #header>New announcement</template>

	<div>
		<MkSpacer :marginMin="20" :marginMax="28">
			<div class="_gaps_m">
				<MkInput ref="announceTitleEl" v-model="title" :large="false">
					<template #label>{{ i18n.ts.title }}&nbsp;<button v-tooltip="i18n.ts.emoji" :class="['_button']" @click="insertEmoji"><i class="ti ti-mood-happy"></i></button></template>
				</MkInput>
				<MkTextarea v-model="text">
					<template #label>{{ i18n.ts.text }}</template>
				</MkTextarea>
				<MkRadios v-model="icon">
					<template #label>{{ i18n.ts.icon }}</template>
					<option value="info"><i class="ti ti-info-circle"></i></option>
					<option value="warning"><i class="ti ti-alert-triangle" style="color: var(--warn);"></i></option>
					<option value="error"><i class="ti ti-circle-x" style="color: var(--error);"></i></option>
					<option value="success"><i class="ti ti-check" style="color: var(--success);"></i></option>
				</MkRadios>
				<MkRadios v-model="display">
					<template #label>{{ i18n.ts.display }}</template>
					<option value="normal">{{ i18n.ts.normal }}</option>
					<option value="banner">{{ i18n.ts.banner }}</option>
					<option value="dialog">{{ i18n.ts.dialog }}</option>
				</MkRadios>
				<MkSwitch v-model="needConfirmationToRead">
					{{ i18n.ts._announcement.needConfirmationToRead }}
					<template #caption>{{ i18n.ts._announcement.needConfirmationToReadDescription }}</template>
				</MkSwitch>
				<MkSwitch v-model="needEnrollmentTutorialToRead">
					{{ i18n.ts._announcement.needEnrollmentTutorialToRead }}
					<template #caption>{{ i18n.ts._announcement.needEnrollmentTutorialToReadDescription }}</template>
				</MkSwitch>
				<MkInput v-model="closeDuration" type="number">
					<template #label>{{ i18n.ts.dialogCloseDuration }}</template>
					<template #suffix>{{ i18n.ts._time.second }}</template>
				</MkInput>
				<MkInput v-model="displayOrder" type="number">
					<template #label>{{ i18n.ts.displayOrder }}</template>
				</MkInput>
				<MkSwitch v-model="silence">
					{{ i18n.ts._announcement.silence }}
					<template #caption>{{ i18n.ts._announcement.silenceDescription }}</template>
				</MkSwitch>
				<p v-if="reads">{{ i18n.tsx.nUsersRead({ n: reads }) }} <span v-if="lastReadAt">(<MkTime :time="lastReadAt" mode="absolute"/>)</span></p>
				<MkUserCardMini v-if="props.user.id" :user="props.user"></MkUserCardMini>
				<MkButton v-if="announcement" danger @click="del()"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
		</MkSpacer>
		<div :class="$style.footer">
			<MkButton primary rounded style="margin: 0 auto;" @click="done"><i class="ti ti-check"></i> {{ props.announcement ? i18n.ts.update : i18n.ts.create }}</MkButton>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';

const props = defineProps<{
	user: Misskey.entities.User,
	announcement?: Misskey.entities.Announcement,
}>();

const dialog = ref<InstanceType<typeof MkModalWindow> | null>(null);
const title = ref<string>(props.announcement ? props.announcement.title : '');
const text = ref<string>(props.announcement ? props.announcement.text : '');
const icon = ref<string>(props.announcement ? props.announcement.icon : 'info');
const display = ref<string>(props.announcement ? props.announcement.display : 'dialog');
const needConfirmationToRead = ref(props.announcement ? props.announcement.needConfirmationToRead : false);
const needEnrollmentTutorialToRead = ref(props.announcement ? props.announcement.needEnrollmentTutorialToRead : false);
const closeDuration = ref<number>(props.announcement ? props.announcement.closeDuration : 0);
const displayOrder = ref<number>(props.announcement ? props.announcement.displayOrder : 0);
const silence = ref<boolean>(props.announcement ? props.announcement.silence : false);
const reads = ref<number>(props.announcement ? props.announcement.reads : 0);
const lastReadAt = ref<string | null>(props.announcement ? props.announcement.lastReadAt : null);

const emit = defineEmits<{
	(ev: 'done', v: { deleted?: boolean; updated?: any; created?: any }): void,
	(ev: 'closed'): void
}>();

const announceTitleEl = shallowRef<HTMLInputElement | null>(null);

function insertEmoji(ev: MouseEvent): void {
	os.openEmojiPicker((ev.currentTarget ?? ev.target) as HTMLElement, {}, announceTitleEl.value);
}

async function done(): Promise<void> {
	const params = {
		title: title.value,
		text: text.value,
		icon: icon.value,
		imageUrl: null,
		display: display.value,
		needConfirmationToRead: needConfirmationToRead.value,
		needEnrollmentTutorialToRead: needEnrollmentTutorialToRead.value,
		closeDuration: closeDuration.value,
		displayOrder: displayOrder.value,
		silence: silence.value,
		reads: reads.value,
		userId: props.user.id,
	};

	if (props.announcement) {
		await os.apiWithDialog('admin/announcements/update', {
			...params,
			id: props.announcement.id,
		});

		emit('done', {
			updated: {
				...params,
				id: props.announcement.id,
			},
		});

		dialog.value?.close();
	} else {
		const created = await os.apiWithDialog('admin/announcements/create', params);

		emit('done', {
			created: created,
		});

		dialog.value?.close();
	}
}

async function del(): Promise<void> {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.removeAreYouSure({ x: title.value }),
	});
	if (canceled) return;

	if (props.announcement) {
		await misskeyApi('admin/announcements/delete', {
			id: props.announcement.id,
		});
	}

	emit('done', {
		deleted: true,
	});
	dialog.value?.close();
}
</script>

<style lang="scss" module>
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
