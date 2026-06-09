export type ReferenceKind =
  | "part-categories"
  | "materials"
  | "suppliers"
  | "measurement-units"
  | "warehouses"
  | "stock-movement-reasons";

export type ReferenceItem = {
  id: number;
  name: string;
  description: string;
};