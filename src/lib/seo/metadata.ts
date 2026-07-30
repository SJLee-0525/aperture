import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  pathname: string;
};

const pageMetadata = ({ title, description, pathname }: PageMetadataInput): Metadata => ({
  title,
  description,
  alternates: {
    canonical: pathname,
  },
  openGraph: {
    type: "website",
    siteName: "Sungjoon Lee",
    locale: "ko_KR",
    title,
    description,
    url: pathname,
  },
  twitter: {
    title,
    description,
  },
});

export { pageMetadata };
