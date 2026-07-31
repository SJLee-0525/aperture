import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AlbumCard } from "./AlbumCard";

const meta = {
  title: "Components/AlbumCard",
  component: AlbumCard,
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    href: "/photo/albums/city-night",
    coverUrl: "/design-samples/tone05.png",
    coverAlt: "푸른 시간의 도시 풍경",
    count: 12,
    title: "도시의 밤",
    subtitle: "2026 · 도쿄·서울",
  },
} satisfies Meta<typeof AlbumCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCover: Story = {
  args: {
    coverUrl: null,
    count: 0,
    title: "새 앨범",
    subtitle: "아직 사진이 없습니다",
  },
};
