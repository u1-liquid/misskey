<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><XHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :contentMax="700" :marginMin="16" :marginMax="32">
		<FormSuspense :p="init">
			<FormSection>
				<template #label>DeepL Translation</template>

				<div class="_gaps_m">
					<MkInput v-model="deeplAuthKey">
						<template #prefix><i class="ti ti-key"></i></template>
						<template #label>DeepL Auth Key</template>
					</MkInput>
					<MkSwitch v-model="deeplIsPro">
						<template #label>Pro account</template>
					</MkSwitch>
				</div>
			</FormSection>
			<FormSection>
				<template #label>Google Analytics</template>

				<div class="_gaps_m">
					<MkInput v-model="googleAnalyticsId">
						<template #prefix><i class="ti ti-report-analytics"></i></template>
						<template #label>Google Analytics ID</template>
					</MkInput>
				</div>
			</FormSection>
		</FormSuspense>
	</MkSpacer>
	<template #footer>
		<div :class="$style.footer">
			<MkSpacer :contentMax="700" :marginMin="16" :marginMax="16">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</MkSpacer>
		</div>
	</template>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XHeader from './_header_.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSuspense from '@/components/form/suspense.vue';
import FormSection from '@/components/form/section.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

const deeplAuthKey = ref<string>('');
const deeplIsPro = ref<boolean>(false);
const googleAnalyticsId = ref<string>('');

async function init() {
	const meta = await misskeyApi('admin/meta');
	deeplAuthKey.value = meta.deeplAuthKey;
	deeplIsPro.value = meta.deeplIsPro;
	googleAnalyticsId.value = meta.googleAnalyticsId;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		deeplAuthKey: deeplAuthKey.value,
		deeplIsPro: deeplIsPro.value,
		googleAnalyticsId: googleAnalyticsId.value,
	}).then(() => {
		fetchInstance(true);
	});
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata(() => ({
	title: i18n.ts.externalServices,
	icon: 'ti ti-link',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
}
</style>
