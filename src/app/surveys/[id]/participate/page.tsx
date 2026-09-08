import { ParticipantFlow } from "@/ui/participant-flow";
export default async function ParticipatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ParticipantFlow key={id} id={id} />;
}
