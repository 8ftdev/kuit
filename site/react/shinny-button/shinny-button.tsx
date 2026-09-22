import { useState } from 'react';
import spark from './spark.svg';
import './button.css';

interface ButtonProps {
 /** Text shown before the first click. */
 label?: string;
 /** Prevent interaction. */
 disabled?: boolean;
}

export default function Button({ label = 'Make it shine', disabled = false }: ButtonProps) {
 const [count, setCount] = useState(0);
 return <button className="demo-button" disabled={disabled} onClick={() => setCount(count + 1)}>
  <img src={spark} alt="" />
  {count ? `Shined ${count} ${count === 1 ? 'time' : 'times'}` : label}
 </button>;
}
