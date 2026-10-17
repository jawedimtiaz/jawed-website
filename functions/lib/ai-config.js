export function aiConfigurationStatus(env){
  return env?.AI&&typeof env.AI.run==="function" ? "configured" : "not_configured";
}
