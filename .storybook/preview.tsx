import type { Decorator, Preview } from "@storybook/nextjs-vite";

import "../src/app/globals.css";
import "./storybook.css";

const withThemeAndSection: Decorator = (Story, context) => {
  const theme = context.globals.theme as "light" | "dark";
  const section = context.globals.section as "photo" | "music" | "dev";

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.section = section;

  return <Story />;
};

const preview: Preview = {
  decorators: [withThemeAndSection],
  globalTypes: {
    theme: {
      description: "전역 색상 테마",
      toolbar: {
        icon: "mirror",
        items: ["light", "dark"],
      },
    },
    section: {
      description: "섹션 액센트",
      toolbar: {
        icon: "paintbrush",
        items: ["photo", "music", "dev"],
      },
    },
  },
  initialGlobals: {
    theme: "light",
    section: "photo",
  },
  parameters: {
    a11y: {
      test: "error",
    },
    backgrounds: {
      disable: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
