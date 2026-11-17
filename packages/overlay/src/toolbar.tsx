import { useState } from 'react';
import {
  MousePointer2,
  X,
  FileText,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  Eye,
  EyeOff,
  PanelRight,
  MapPin,
  RotateCw,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { renderView } from './render';

export type ToolbarState = {
  active: boolean;
  collapsed: boolean;
  count: number;
  review: number;
  connected: boolean;
  connection: string;
  needsSetup: boolean;
};
export function mountToolbar(
  node: HTMLElement,
  actions: {
    annotate: () => void;
    pageWide: () => void;
    feedback: () => void;
    setup: () => void;
    layout: () => void;
    collapse: () => void;
  },
) {
  let state: ToolbarState = {
    active: false,
    collapsed: false,
    count: 0,
    review: 0,
    connected: false,
    connection: 'Disconnected',
    needsSetup: true,
  };
  const refs = {} as {
    toggle: HTMLButtonElement;
    tray: HTMLButtonElement;
    setup: HTMLButtonElement;
    layout: HTMLButtonElement;
    collapse: HTMLButtonElement;
  };
  const paint = () => {
    const feedback = `Feedback (${state.count}${state.review ? `, ${state.review} ready for review` : ''})`;
    const setup = state.connected
      ? 'Agent setup'
      : `Agent setup (${state.connection})`;
    renderView(
      node,
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          ref={(el) => {
            refs.toggle = el!;
          }}
          aria-label={state.active ? 'Exit annotation' : 'Annotate UI'}
          aria-pressed={state.active}
          data-tip={state.active ? 'Exit annotation' : 'Annotate UI'}
          onClick={actions.annotate}
        >
          {state.active ? <X /> : <MousePointer2 />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          aria-label="Request a page-wide change"
          data-tip="Request a page-wide change"
          onClick={actions.pageWide}
        >
          <FileText />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          ref={(el) => {
            refs.tray = el!;
          }}
          aria-label={feedback}
          data-tip={
            state.review
              ? `Feedback · ${state.review} ready for review`
              : state.count
                ? `Feedback · ${state.count} open`
                : 'Feedback'
          }
          onClick={actions.feedback}
        >
          <MessageSquare />
          <span
            className="badge"
            data-state={state.review ? 'review' : state.count ? 'open' : 'none'}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          ref={(el) => {
            refs.setup = el!;
          }}
          aria-label={setup}
          data-tip={setup}
          data-offline={!state.connected}
          data-needs-setup={state.needsSetup}
          onClick={actions.setup}
        >
          <Settings />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          ref={(el) => {
            refs.layout = el!;
          }}
          aria-label="Layout and theme"
          data-tip="Layout and theme"
          onClick={actions.layout}
        >
          <SlidersHorizontal />
        </Button>
        <Separator orientation="vertical" className="sep" />
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          ref={(el) => {
            refs.collapse = el!;
          }}
          aria-label={state.collapsed ? 'Show toolbar' : 'Hide toolbar'}
          data-tip={state.collapsed ? 'Show toolbar' : 'Hide toolbar'}
          onClick={actions.collapse}
        >
          {state.collapsed ? <Eye /> : <EyeOff />}
        </Button>
      </>,
    );
  };
  paint();
  return {
    refs,
    update: (next: Partial<ToolbarState>) => {
      state = { ...state, ...next };
      paint();
    },
  };
}
export function renderHeader(
  node: HTMLElement,
  props: {
    title: string;
    tray: boolean;
    docked: boolean;
    onClose: () => void;
    onBack: () => void;
    onDock: () => void;
    onRefresh: () => void;
  },
) {
  function Header() {
    const [docked, setDocked] = useState(props.docked);
    return (
      <>
        {!props.tray && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="icon"
            aria-label="Back to feedback"
            onClick={props.onBack}
          >
            <ArrowLeft />
          </Button>
        )}
        <h2>{props.title}</h2>
        {props.tray ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="icon"
            aria-label="Refresh"
            onClick={props.onRefresh}
          >
            <RotateCw />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="icon"
            aria-label={docked ? 'Pin to element' : 'Open in side panel'}
            onClick={() => {
              setDocked(!docked);
              props.onDock();
            }}
          >
            {docked ? <MapPin /> : <PanelRight />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon"
          aria-label={props.tray ? 'Close' : 'Close comment'}
          onClick={props.onClose}
        >
          <X />
        </Button>
      </>
    );
  }
  renderView(node, <Header />);
}
