import type {
  NomenclatureRequest,
  NomenclatureRequestType
} from "../entities/NomenclatureRequest";

export type CreateNomenclatureRequestRecord = {
  requestType: NomenclatureRequestType;
  targetNomenclatureId: number | null;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
  comment: string;
  createdBy: string;
  createdByRole: string;
};

export interface NomenclatureRequestRepository {
  findAll(): Promise<NomenclatureRequest[]>;
  createDraft(
    request: CreateNomenclatureRequestRecord
  ): Promise<NomenclatureRequest>;
  submit(id: number): Promise<NomenclatureRequest>;
  approve(id: number, reviewedBy: string): Promise<NomenclatureRequest>;
  reject(
    id: number,
    reviewedBy: string,
    rejectReason: string
  ): Promise<NomenclatureRequest>;
}
