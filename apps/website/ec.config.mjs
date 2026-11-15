import { defineEcConfig } from '@astrojs/starlight/expressive-code';

export default defineEcConfig({
  themes: ['vesper', 'github-light'],
  defaultProps: { frame: 'none' },
  frames: {
    extractFileNameFromCode: false,
    showCopyToClipboardButton: true,
  },
  styleOverrides: {
    borderColor: 'var(--sl-color-hairline)',
    borderRadius: '0px',
    borderWidth: '1px',
    codeBackground: ({ theme }) =>
      theme.type === 'dark' ? '#101010' : '#fafafa',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.8125rem',
    codeLineHeight: '1.8',
    codePaddingBlock: '1rem',
    codePaddingInline: '1rem',
    frames: {
      frameBoxShadowCssValue: 'none',
      inlineButtonBackground: 'var(--sl-color-bg)',
      inlineButtonForeground: 'var(--sl-color-gray-3)',
      inlineButtonBorder: 'var(--sl-color-hairline)',
      inlineButtonBorderOpacity: '1',
      tooltipSuccessBackground: 'var(--nudge-primary)',
      tooltipSuccessForeground: '#000',
    },
  },
});
