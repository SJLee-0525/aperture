import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Modal } from "./Modal";

const meta = {
  title: "Components/Modal",
  component: Modal,
  args: {
    open: true,
    onClose: fn(),
    closeLabel: "닫기",
    crumb: "Music · Recital",
    label: "겨울 나그네 연주 상세",
    maxWidth: 680,
    children: (
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32 }}>겨울 나그네</h2>
        <p style={{ color: "var(--text-2)" }}>
          공연 정보와 프로그램을 보여주는 열린 모달의 기본 상태입니다.
        </p>
        <button type="button">예매하기</button>
      </div>
    ),
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const MobileFull: Story = {
  args: {
    mobileFull: true,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
