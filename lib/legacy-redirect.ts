export type LegacySearchParams=Promise<Record<string,string|string[]|undefined>>;

export async function legacyDestination(destination:string,searchParams:LegacySearchParams){
  const query=new URLSearchParams();
  for(const[key,value]of Object.entries(await searchParams)){
    for(const item of Array.isArray(value)?value:[value])if(item)query.append(key,item);
  }
  const suffix=query.toString();
  return suffix?`${destination}?${suffix}`:destination;
}
