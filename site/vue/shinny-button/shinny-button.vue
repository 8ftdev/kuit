<script setup lang="ts">
import { ref } from 'vue';
import spark from './spark.svg';
import './button.css';

interface Props {
 /** Button text. */
 label?: string;
 disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { label: 'Make it shine', disabled: false });
const count = ref(0);
</script>

<template>
 <button class="demo-button" :disabled="props.disabled" @click="count++">
  <img :src="spark" alt="" />
  {{ count ? `Shined ${count} ${count === 1 ? 'time' : 'times'}` : props.label }}
 </button>
</template>
