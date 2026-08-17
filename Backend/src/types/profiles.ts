export type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  skin_type_code: string | null;
  skin_type_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileDto = {
  id: string;
  userId: string;
  displayName: string | null;
  skinTypeCode: string | null;
  skinTypeCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
