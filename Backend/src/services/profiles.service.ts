import { createProfile, findProfileByUserId } from "../repositories/profiles.repository.js";
import type { ProfileDto, ProfileRow } from "../types/profiles.js";

const toProfileDto = (profile: ProfileRow): ProfileDto => ({
  id: profile.id,
  userId: profile.user_id,
  displayName: profile.display_name,
  skinTypeCode: profile.skin_type_code,
  skinTypeCompletedAt: profile.skin_type_completed_at,
  createdAt: profile.created_at,
  updatedAt: profile.updated_at
});

export const getOrCreateProfile = async (userId: string): Promise<ProfileDto> => {
  const existingProfile = await findProfileByUserId(userId);

  if (existingProfile) {
    return toProfileDto(existingProfile);
  }

  const createdProfile = await createProfile({ userId });
  return toProfileDto(createdProfile);
};
