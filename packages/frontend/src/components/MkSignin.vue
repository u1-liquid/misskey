<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<form :class="{ signing, totpLogin }" @submit.prevent="onSubmit">
	<div class="_gaps_m">
		<div v-show="withAvatar && !loginWithEmailAddress" :class="$style.avatar" :style="{ backgroundImage: user ? `url('${ user.avatarUrl }')` : undefined, marginBottom: message ? '1.5em' : undefined }"></div>
		<MkInfo v-if="message">
			{{ message }}
		</MkInfo>
		<div v-if="!totpLogin" class="normal-signin _gaps_m">
			<MkInput v-model="username" :debounce="true" :placeholder="loginWithEmailAddress ? i18n.ts.emailAddress : i18n.ts.username" type="text" :pattern="loginWithEmailAddress ? '^[a-zA-Z0-9_@.]+$' : '^[a-zA-Z0-9_]+$'" :spellcheck="false" :autocomplete="loginWithEmailAddress ? 'email webauthn' : 'username webauthn'" autofocus required data-cy-signin-username @update:modelValue="onUsernameChange">
				<template #prefix>
					<i v-if="loginWithEmailAddress" class="ti ti-mail"></i>
					<span v-else>@</span>
				</template>
				<template v-if="!loginWithEmailAddress" #suffix>@{{ host }}</template>
				<template #caption>
					<button class="_textButton" type="button" tabindex="-1" @click="loginWithEmailAddress = !loginWithEmailAddress">{{ loginWithEmailAddress ? i18n.ts.usernameLogin : i18n.ts.emailAddressLogin }}</button>
				</template>
			</MkInput>
			<MkInput v-if="!user || user && !user.usePasswordLessLogin" v-model="password" :placeholder="i18n.ts.password" type="password" autocomplete="current-password webauthn" :withPasswordToggle="true" required data-cy-signin-password>
				<template #prefix><i class="ti ti-lock"></i></template>
				<template #caption>
					<button class="_textButton" type="button" tabindex="-1" @click="resetPassword">{{ i18n.ts.forgotPassword }}</button>
				</template>
			</MkInput>
			<MkCaptcha v-if="!user?.twoFactorEnabled && instance.enableHcaptcha" ref="hcaptcha" v-model="hCaptchaResponse" :class="$style.captcha" provider="hcaptcha" :sitekey="instance.hcaptchaSiteKey"/>
			<MkCaptcha v-if="!user?.twoFactorEnabled && instance.enableMcaptcha" ref="mcaptcha" v-model="mCaptchaResponse" :class="$style.captcha" provider="mcaptcha" :sitekey="instance.mcaptchaSiteKey" :instanceUrl="instance.mcaptchaInstanceUrl"/>
			<MkCaptcha v-if="!user?.twoFactorEnabled && instance.enableRecaptcha" ref="recaptcha" v-model="reCaptchaResponse" :class="$style.captcha" provider="recaptcha" :sitekey="instance.recaptchaSiteKey"/>
			<MkCaptcha v-if="!user?.twoFactorEnabled && instance.enableTurnstile" ref="turnstile" v-model="turnstileResponse" :class="$style.captcha" provider="turnstile" :sitekey="instance.turnstileSiteKey"/>
			<MkButton type="submit" large primary rounded :disabled="(!loginWithEmailAddress && !user) || captchaFailed || signing" style="margin: 0 auto;">{{ signing ? i18n.ts.loggingIn : i18n.ts.login }}</MkButton>
		</div>
		<div v-if="totpLogin" class="2fa-signin" :class="{ securityKeys: user && user.securityKeys }">
			<div v-if="user && user.securityKeys" class="twofa-group tap-group">
				<p>{{ i18n.ts.useSecurityKey }}</p>
				<MkButton v-if="!queryingKey" @click="queryKey">
					{{ i18n.ts.retry }}
				</MkButton>
			</div>
			<div v-if="user && user.securityKeys" class="or-hr">
				<p class="or-msg">{{ i18n.ts.or }}</p>
			</div>
			<div class="twofa-group totp-group _gaps">
				<MkInput v-if="user && user.usePasswordLessLogin" v-model="password" type="password" autocomplete="current-password" :withPasswordToggle="true" required>
					<template #label>{{ i18n.ts.password }}</template>
					<template #prefix><i class="ti ti-lock"></i></template>
				</MkInput>
				<MkInput v-model="token" type="text" :pattern="isBackupCode ? '^[A-Z0-9]{32}$' :'^[0-9]{6}$'" autocomplete="one-time-code" required :spellcheck="false" :inputmode="isBackupCode ? undefined : 'numeric'">
					<template #label>{{ i18n.ts.token }} ({{ i18n.ts['2fa'] }})</template>
					<template #prefix><i v-if="isBackupCode" class="ti ti-key"></i><i v-else class="ti ti-123"></i></template>
					<template #caption><button class="_textButton" type="button" @click="isBackupCode = !isBackupCode">{{ isBackupCode ? i18n.ts.useTotp : i18n.ts.useBackupCode }}</button></template>
				</MkInput>
				<MkButton type="submit" :disabled="signing" large primary rounded style="margin: 0 auto;">{{ signing ? i18n.ts.loggingIn : i18n.ts.login }}</MkButton>
			</div>
		</div>
	</div>
</form>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref } from 'vue';
import { toUnicode } from 'punycode.js';
import * as Misskey from 'misskey-js';
import { supported as webAuthnSupported, get as webAuthnRequest, parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill';
import { showSuspendedDialog } from '@/scripts/show-suspended-dialog.js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import { host as configHost } from '@/config.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { login } from '@/account.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import MkCaptcha, { type Captcha } from '@/components/MkCaptcha.vue';

const signing = ref(false);
const loginWithEmailAddress = ref(false);
const userAbortController = ref<AbortController>();
const user = ref<Misskey.entities.UserDetailed | null>(null);
const username = ref('');
const password = ref('');
const token = ref('');
const host = ref(toUnicode(configHost));
const totpLogin = ref(false);
const isBackupCode = ref(false);
const queryingKey = ref(false);
const credentialRequest = ref<CredentialRequestOptions | null>(null);
const hcaptcha = ref<Captcha | undefined>();
const mcaptcha = ref<Captcha | undefined>();
const recaptcha = ref<Captcha | undefined>();
const turnstile = ref<Captcha | undefined>();
const hCaptchaResponse = ref<string | null>(null);
const mCaptchaResponse = ref<string | null>(null);
const reCaptchaResponse = ref<string | null>(null);
const turnstileResponse = ref<string | null>(null);

const captchaFailed = computed((): boolean => {
	return !user.value?.twoFactorEnabled && (
		instance.enableHcaptcha && !hCaptchaResponse.value ||
		instance.enableMcaptcha && !mCaptchaResponse.value ||
		instance.enableRecaptcha && !reCaptchaResponse.value ||
		instance.enableTurnstile && !turnstileResponse.value);
});

const emit = defineEmits<{
	(ev: 'login', v: any): void;
}>();

const props = defineProps({
	withAvatar: {
		type: Boolean,
		required: false,
		default: true,
	},
	autoSet: {
		type: Boolean,
		required: false,
		default: false,
	},
	message: {
		type: String,
		required: false,
		default: '',
	},
});

async function onUsernameChange(): Promise<void> {
	if (loginWithEmailAddress.value) return;

	if (userAbortController.value) {
		userAbortController.value.abort();
	}
	userAbortController.value = new AbortController();
	misskeyApi('users/show', {
		username: username.value,
	}, undefined, userAbortController.value.signal).then(userResponse => {
		user.value = userResponse;
	}, () => {
		user.value = null;
	});
}

function onLogin(res: any): Promise<void> | void {
	if (props.autoSet) {
		return login(res.i);
	}
}

async function queryKey(): Promise<void> {
	if (credentialRequest.value == null) return;
	queryingKey.value = true;
	await webAuthnRequest(credentialRequest.value)
		.catch(() => {
			queryingKey.value = false;
			return Promise.reject(null);
		}).then(credential => {
			credentialRequest.value = null;
			queryingKey.value = false;
			signing.value = true;
			return misskeyApi('signin', {
				username: username.value,
				password: password.value,
				credential: credential.toJSON(),
			});
		}).then(res => {
			emit('login', res);
			return onLogin(res);
		}).catch(err => {
			if (err === null) return;
			os.alert({
				type: 'error',
				text: i18n.ts.signinFailed,
			});
			signing.value = false;
		});
}

async function onSubmit(): Promise<void> {
	signing.value = true;
	if (loginWithEmailAddress.value) {
		user.value = await misskeyApi('users/get-security-info', {
			email: username.value,
			password: password.value,
		});
	}

	if (!totpLogin.value && user.value?.twoFactorEnabled) {
		if (webAuthnSupported() && user.value.securityKeys) {
			misskeyApi('signin', {
				username: username.value,
				password: password.value,
			}).then(res => {
				totpLogin.value = true;
				signing.value = false;
				credentialRequest.value = parseRequestOptionsFromJSON({
					publicKey: res,
				});
			})
				.then(() => queryKey())
				.catch(loginFailed);
		} else {
			totpLogin.value = true;
			signing.value = false;
		}
	} else {
		misskeyApi('signin', {
			username: username.value,
			password: password.value,
			'hcaptcha-response': hCaptchaResponse.value,
			'm-captcha-response': mCaptchaResponse.value,
			'g-recaptcha-response': reCaptchaResponse.value,
			'turnstile-response': turnstileResponse.value,
			token: user.value?.twoFactorEnabled ? token.value : undefined,
		}).then(res => {
			emit('login', res);
			onLogin(res);
		}).catch(loginFailed);
	}
}

function loginFailed(err: any): void {
	hcaptcha.value?.reset?.();
	mcaptcha.value?.reset?.();
	recaptcha.value?.reset?.();
	turnstile.value?.reset?.();

	switch (err.id) {
		case '6cc579cc-885d-43d8-95c2-b8c7fc963280': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.noSuchUser,
			});
			break;
		}
		case '932c904e-9460-45b7-9ce6-7ed33be7eb2c': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.authenticationFailed,
			});
			break;
		}
		case 'e03a5f46-d309-4865-9b69-56282d94e1eb': {
			showSuspendedDialog();
			break;
		}
		case '22d05606-fbcf-421a-a2db-b32610dcfd1b': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.rateLimitExceeded,
			});
			break;
		}
		default: {
			console.error(err);
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: JSON.stringify(err),
			});
		}
	}

	totpLogin.value = false;
	signing.value = false;
}

function resetPassword(): void {
	os.popup(defineAsyncComponent(() => import('@/components/MkForgotPassword.vue')), {}, {
	}, 'closed');
}
</script>

<style lang="scss" module>
.avatar {
	margin: 0 auto 0 auto;
	width: 64px;
	height: 64px;
	background: #ddd center;
	background-size: cover;
	border-radius: 100%;
}
</style>
