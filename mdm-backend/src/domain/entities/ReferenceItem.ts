export type ReferenceKind =
  | "part-categories"
  | "materials"
  | "suppliers"
  | "measurement-units";

export type ReferenceItem = {
  id: number;
  name: string;
  description: string;
};