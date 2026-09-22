import { Lineicons } from '@lineiconshq/react-lineicons';
import { ReactOutlined, VuejsOutlined, SvelteOutlined, Code1Outlined, RefreshCircle1ClockwiseOutlined, ArrowAngularTopRightOutlined, ChevronRightOutlined, ChevronDownOutlined, Layers1Outlined } from '@lineiconshq/free-icons';

const icons={react:ReactOutlined,vue:VuejsOutlined,svelte:SvelteOutlined,solid:Code1Outlined,reload:RefreshCircle1ClockwiseOutlined,external:ArrowAngularTopRightOutlined,right:ChevronRightOutlined,down:ChevronDownOutlined,layers:Layers1Outlined};
export default function Icon({name,size=16,className}:{name:keyof typeof icons;size?:number;className?:string}) {
 return <Lineicons icon={icons[name]} size={size} aria-hidden="true" className={className}/>;
}
