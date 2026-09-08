import { SurveyDetail } from "@/ui/survey-detail";
export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SurveyDetail id={id} />;
}
