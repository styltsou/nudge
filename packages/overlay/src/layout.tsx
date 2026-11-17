import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { renderView } from './render';

type Position = 'bottom' | 'top' | 'left' | 'right';
type Theme = 'system' | 'light' | 'dark';
function Segmented<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <RadioGroup
      aria-label={label}
      className="segmented flex"
      value={value}
      onValueChange={(value) => onChange(value as T)}
    >
      {choices.map((choice) => (
        <RadioGroupItem
          key={choice}
          value={choice}
          aria-label={choice[0]!.toUpperCase() + choice.slice(1)}
          className="h-6 w-auto flex-1 aspect-auto rounded-md border-0 px-2 text-[11px] after:hidden data-checked:bg-secondary data-checked:text-foreground"
        >
          {choice[0]!.toUpperCase() + choice.slice(1)}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}
export function renderLayout(
  node: HTMLElement,
  props: {
    position: Position;
    side: 'left' | 'right';
    theme: Theme;
    onPosition: (value: Position) => void;
    onSide: (value: 'left' | 'right') => void;
    onTheme: (value: Theme) => void;
  },
) {
  function Layout() {
    const [position, setPosition] = useState(props.position);
    const [side, setSide] = useState(props.side);
    const [theme, setTheme] = useState(props.theme);
    return (
      <>
        <div className="popover-row">
          <span className="popover-label">Toolbar</span>
          <Segmented
            label="Toolbar position"
            choices={['bottom', 'top', 'left', 'right']}
            value={position}
            onChange={(value) => {
              setPosition(value);
              props.onPosition(value);
            }}
          />
        </div>
        <div className="popover-row">
          <span className="popover-label">Side panel</span>
          <Segmented
            label="Side panel position"
            choices={['left', 'right']}
            value={side}
            onChange={(value) => {
              setSide(value);
              props.onSide(value);
            }}
          />
        </div>
        <div className="popover-row">
          <span className="popover-label">Theme</span>
          <Segmented
            label="Appearance"
            choices={['system', 'light', 'dark']}
            value={theme}
            onChange={(value) => {
              setTheme(value);
              props.onTheme(value);
            }}
          />
        </div>
      </>
    );
  }
  renderView(node, <Layout />);
}
