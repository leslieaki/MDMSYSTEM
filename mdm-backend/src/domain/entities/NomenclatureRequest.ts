export type NomenclatureRequestType = "create" | "update";

export type NomenclatureRequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected";

export type NomenclatureRequest = {
  id: number;
  requestType: NomenclatureRequestType;
  status: NomenclatureRequestStatus;
  targetNomenclatureId: number | null;
  targetCode: string;
  targetName: string;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
  comment: string;
  rejectReason: string;
  createdBy: string;
  createdByRole: string;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
