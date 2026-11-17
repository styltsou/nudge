import { renderSetup } from '@usenudge/overlay';
import type { ManagedState } from '../../shared/src/runs';

/** Engine-to-view adapter: provider commands still run only through the runner. */
export class OnboardingPanel {
  private node = document.createElement('div');
  private portal = document.createElement('div');
  private opened = false;
  private connected = false;
  private state: ManagedState = {
    enabled: false,
    online: false,
    runs: [],
    sessions: [],
  };
  constructor(
    shadow: ShadowRoot,
    private trigger: HTMLButtonElement,
    private refresh: () => Promise<void>,
    private request: (path: string, body: unknown) => Promise<unknown>,
    private annotate: () => void,
  ) {
    this.portal.dataset.nudgePortal = '';
    shadow.append(this.node, this.portal);
    this.render();
  }
  open() {
    this.opened = true;
    this.render();
  }
  get isOpen() {
    return this.opened;
  }
  connection(value: boolean) {
    this.connected = value;
    this.render();
  }
  update(state: ManagedState) {
    this.state = state;
    this.render();
  }
  private render() {
    renderSetup(this.node, {
      open: this.opened,
      connected: this.connected,
      state: this.state,
      container: this.portal,
      onOpenChange: (open) => {
        this.opened = open;
        this.render();
      },
      onClose: () => this.trigger.focus(),
      refresh: this.refresh,
      request: this.request,
      annotate: this.annotate,
    });
  }
}
