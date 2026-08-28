import { OnDemandPhotoModal } from "@/features/photo-detail/_components/OnDemandPhotoModal";

type Props = {
  photoIds: string[];
};

const MapPhotoModal = ({ photoIds }: Props) => {
  return <OnDemandPhotoModal photoIds={photoIds} endpoint="/api/photo-map" chatTarget />;
};

export { MapPhotoModal };
