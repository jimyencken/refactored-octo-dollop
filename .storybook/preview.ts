import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme for components",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "light";
      document.documentElement.setAttribute("data-theme", theme);
      return Story();
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      defaultViewport: "iphone14",
      viewports: {
        iphone14: {
          name: "iPhone 14",
          styles: {
            width: "390px",
            height: "844px",
          },
        },
      },
    },
  },
};

export default preview;
