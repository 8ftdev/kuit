import { createSignal } from 'solid-js';
import spark from '../assets/spark.svg';
import '../shared/button.css';

interface Props {
 /** Button text. */
 label?: string;
 disabled?: boolean;
}

export default function Button(props: Props) {
 const [count, setCount] = createSignal(0);
 return <button class="demo-button" disabled={props.disabled} onClick={() => setCount(count() + 1)}>
  <img src={spark} alt="" />
  {count() ? `Shined ${count()} ${count() === 1 ? 'time' : 'times'}` : (props.label ?? 'Make it shine')}
 </button>;
}
