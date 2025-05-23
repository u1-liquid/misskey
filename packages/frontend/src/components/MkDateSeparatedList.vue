<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script lang="ts">
import { defineComponent, h, PropType, TransitionGroup, useCssModule } from 'vue';
import MkAd from '@/components/global/MkAd.vue';
import { isDebuggerEnabled, stackTraceInstances } from '@/debug.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { defaultStore } from '@/store.js';
import { MisskeyEntity } from '@/types/date-separated-list.js';
import { isAprilFoolsDay } from '@/scripts/seasonal-events';

export default defineComponent({
	props: {
		items: {
			type: Array as PropType<MisskeyEntity[]>,
			required: true,
		},
		direction: {
			type: String,
			required: false,
			default: 'down',
		},
		reversed: {
			type: Boolean,
			required: false,
			default: false,
		},
		noGap: {
			type: Boolean,
			required: false,
			default: false,
		},
		ad: {
			type: Boolean,
			required: false,
			default: false,
		},
	},

	setup(props, { slots, expose }) {
		const $style = useCssModule(); // カスタムレンダラなので使っても大丈夫

		function getDateText(time: string) {
			const date = new Date(time).getDate();
			const month = new Date(time).getMonth() + 1;
			return i18n.tsx.monthAndDay({
				month: month.toString(),
				day: date.toString(),
			});
		}

		if (props.items.length === 0) return;

		const renderChildrenImpl = () => props.items.map((item, i) => {
			if (!slots || !slots.default) return;

			const el = slots.default({
				item: item,
			})[0];
			if (el.key == null && item.id) el.key = item.id;

			if (
				i !== props.items.length - 1 &&
				new Date(item.createdAt).getDate() !== new Date(props.items[i + 1].createdAt).getDate()
			) {
				const separator = h('div', {
					class: $style['separator'],
					key: item.id + ':separator',
				}, h('p', {
					class: $style['date'],
				}, [
					h('span', {
						class: $style['date-1'],
					}, [
						h('i', {
							class: `ti ti-chevron-up ${$style['date-1-icon']}`,
						}),
						getDateText(item.createdAt),
					]),
					h('span', {
						class: $style['date-2'],
					}, [
						getDateText(props.items[i + 1].createdAt),
						h('i', {
							class: `ti ti-chevron-down ${$style['date-2-icon']}`,
						}),
					]),
				]));

				return [el, separator];
			} else {
				if (props.ad && item._shouldInsertAd_) {
					return [h(MkAd, {
						key: item.id + ':ad',
						prefer: [],
					}), el];
				} else {
					return el;
				}
			}
		});

		const renderChildren = () => {
			const children = renderChildrenImpl();
			if (isDebuggerEnabled(6864)) {
				const nodes = children.flatMap((node) => node ?? []);
				const keys = new Set(nodes.map((node) => node.key));
				if (keys.size !== nodes.length) {
					const id = crypto.randomUUID();
					const instances = stackTraceInstances();
					os.toast(instances.reduce((a, c) => `${a} at ${c.type.name}`, `[DEBUG_6864 (${id})]: ${nodes.length - keys.size} duplicated keys found`));
					console.warn({ id, debugId: 6864, stack: instances });
				}
			}
			return children;
		};

		function onBeforeLeave(element: Element) {
			const el = element as HTMLElement;
			el.style.top = `${el.offsetTop}px`;
			el.style.left = `${el.offsetLeft}px`;
		}

		function onLeaveCancelled(element: Element) {
			const el = element as HTMLElement;
			el.style.top = '';
			el.style.left = '';
		}

		// eslint-disable-next-line vue/no-setup-props-destructure
		const classes = {
			[$style['date-separated-list']]: true,
			[$style['date-separated-list-nogap']]: props.noGap,
			[$style['direction-down']]: props.direction === 'down',
			[$style['direction-up']]: props.direction === 'up',
			[$style['april-fool']]: defaultStore.state.animation ? isAprilFoolsDay() : false,
		};

		return () => defaultStore.state.animation ? h(TransitionGroup, {
			class: classes,
			name: 'list',
			tag: 'div',
			onBeforeLeave: !isAprilFoolsDay() ? onBeforeLeave : undefined,
			onLeaveCancelled: !isAprilFoolsDay() ? onLeaveCancelled : undefined,
		}, { default: renderChildren }) : h('div', {
			class: classes,
		}, { default: renderChildren });
	},
});
</script>

<style lang="scss" module>
.date-separated-list {
	container-type: inline-size;

	&:global {
	> .list-move {
		transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
	}

	&.deny-move-transition > .list-move {
		transition: none !important;
	}

	> .list-enter-active {
		transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1);
	}

	> *:empty {
		display: none;
	}
	}

	&:not(.date-separated-list-nogap) > *:not(:last-child) {
		margin-bottom: var(--margin);
	}
}

.date-separated-list-nogap {
	> * {
		margin: 0 !important;
		border: none;
		border-radius: 0;
		box-shadow: none;

		&:not(:last-child) {
			border-bottom: solid 0.5px var(--divider);
		}
	}
}

.direction-up {
	&:global {
	> .list-enter-from,
	> .list-leave-to {
		opacity: 0;
		transform: translateY(64px);
	}
	}
}
.direction-down {
	&:global {
	> .list-enter-from,
	> .list-leave-to {
		opacity: 0;
		transform: translateY(-64px);
	}
	}
}

.april-fool {
	&:global > .list-enter-from,
	&:global > .list-leave-to {
		animation: global-spin-shrink 3s ease-in forwards;
	}
}

.separator {
	text-align: center;
}

.date {
	display: inline-block;
	position: relative;
	margin: 0;
	padding: 0 16px;
	line-height: 32px;
	text-align: center;
	font-size: 12px;
	color: var(--dateLabelFg);
}

.date-1 {
	margin-right: 8px;
}

.date-1-icon {
	margin-right: 8px;
}

.date-2 {
	margin-left: 8px;
}

.date-2-icon {
	margin-left: 8px;
}
</style>

