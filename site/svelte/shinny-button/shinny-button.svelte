<script lang="ts">
import spark from './spark.svg';
import './button.css';

interface Props {
 /** Button text. */
 label?: string;
 disabled?: boolean;
}
let { label = 'Make it shine', disabled = false }: Props = $props();
let count = $state(0);
</script>

<button class="demo-button" {disabled} onclick={() => count++}>
 <img src={spark} alt="" />
 {count ? `Shined ${count} ${count === 1 ? 'time' : 'times'}` : label}
</button>
