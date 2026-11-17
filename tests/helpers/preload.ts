import { installDom } from './dom';

// Install a browser environment before any React DOM/Base UI module is loaded.
// Individual suites still own and restore their isolated documents.
installDom();
