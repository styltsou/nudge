import { Button } from './components/ui/button';
import { Spinner } from './managed';
import { renderView } from './render';

export function mountPin(actions: {
  onClick: () => void;
  onHover: (active: boolean) => void;
}) {
  const node = document.createElement('div');
  node.className = 'contents';
  let button: HTMLButtonElement;
  function update(label: string, working: boolean) {
    renderView(
      node,
      <Button
        ref={(el) => {
          button = el!;
        }}
        size="icon-xs"
        className="pin h-[22px] w-[22px] p-0 text-[11px] text-primary-foreground"
        data-working={working}
        data-label={label}
        onClick={actions.onClick}
        onPointerEnter={() => actions.onHover(true)}
        onPointerLeave={() => actions.onHover(false)}
      >
        {label}
        {working && <Spinner />}
      </Button>,
    );
  }
  update('', false);
  return { node, button: button!, update };
}
