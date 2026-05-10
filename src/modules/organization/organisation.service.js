import { ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as organisationDb from "./organisation.db.js";

const normalizePayload = (payload) => ({
  ...payload,
  email: payload.email || null,
  phone: payload.phone || null,
  logoUrl: payload.logoUrl || null,
  address: payload.address || null,
  socialLinks: payload.socialLinks || null,
  settings: payload.settings || null,
});

export const getOrganisation = async () => {
  const organisation = await organisationDb.findFirstOrganisation();

  if (!organisation) {
    throw new NotFoundError("Organisation profile has not been created");
  }

  return organisation;
};

export const upsertOrganisation = async (payload) => {
  const data = normalizePayload(payload);

  const existingOrganisation = await organisationDb.findFirstOrganisation();

  if (!existingOrganisation) {
    return organisationDb.createOrganisation(data);
  }

  if (data.slug !== existingOrganisation.slug) {
    const slugOwner = await organisationDb.findOrganisationBySlug(data.slug);

    if (slugOwner && slugOwner.id !== existingOrganisation.id) {
      throw new ConflictError("Organisation slug is already in use");
    }
  }

  return organisationDb.updateOrganisation(existingOrganisation.id, data);
};
