import { CreateSurveyForm } from "@/ui/create-survey-form";

export default async function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreateSurveyForm id={id} />;
}
