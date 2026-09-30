export function aiConfigurationStatus(env){
  return env?.AI_PROVIDER_API_KEY ? "configured" : "not_configured";
}
