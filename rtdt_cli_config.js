'use strict';
/* Declarative CLI jobs. JSON and YAML supported, never executed as scripts. */
const fs=require('fs');
const path=require('path');
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const allowed=new Set(['scene','sceneName','sceneFile','width','height','quality','output','outputFile','outputDir','phy','phyFile','time','phyTime','frame','phyFrame']);
function loadDocument(filename) {
    const input=fs.readFileSync(filename,'utf8');
    let model;
    try {
        const ext=path.extname(filename).toLowerCase();
        if (ext==='.yaml'||ext==='.yml') model=require('yaml').parse(input,{uniqueKeys:true});
        else if (['.json','.rdt','.scene'].includes(ext)) model=JSON.parse(input);
        else throw new Error('Expected JSON (.json/.rdt/.scene) or YAML (.yaml/.yml)');
    } catch(error) { throw new Error('Cannot parse '+filename+': '+error.message); }
    if (!isObject(model)&&!Array.isArray(model)) throw new Error('Configuration must be an object or jobs array');
    return model;
}
function validateJob(job) {
    if (!isObject(job)) throw new Error('Render job must be an object');
    for(const key of Object.keys(job)) if(!allowed.has(key)) throw new Error('Unknown job setting: '+key);
    for(const key of ['width','height','quality']) {
        const v=job[key];
        if (v!==undefined&&(!Number.isInteger(v)||v<1||(key==='quality'?v>20:v>4096)))
            throw new Error(key+' must be an integer within 1..'+(key==='quality'?20:4096));
    }
    for(const key of ['time','phyTime','frame','phyFrame']) {
        const v=job[key];
        if (v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)||v<0||
            (key.toLowerCase().includes('frame')&&!Number.isInteger(v))))
            throw new Error(key+' must be a nonnegative '+(key.toLowerCase().includes('frame')?'integer':'number'));
    }
    for(const key of ['scene','sceneName','sceneFile','output','outputFile','outputDir','phy','phyFile']) {
        if(job[key]!==undefined&&(typeof job[key]!=='string'||!job[key].trim()))
            throw new Error(key+' must be a nonempty string');
    }
    if(job.sceneFile&&(job.scene||job.sceneName))throw new Error('Choose sceneFile or built-in scene, not both');
    return job;
}
function normalizeJob(job,baseDir) {
    validateJob(job);
    const names={
        scene:'sceneName',sceneName:'sceneName',sceneFile:'sceneFile',width:'width',height:'height',
        quality:'quality',output:'outputFile',outputFile:'outputFile',outputDir:'outputDir',
        phy:'phyFile',phyFile:'phyFile',time:'phyTime',phyTime:'phyTime',
        frame:'phyFrame',phyFrame:'phyFrame'
    },result={};
    for(const key of Object.keys(job)){
        const canonical=names[key];
        if(Object.prototype.hasOwnProperty.call(result,canonical))
            throw new Error('Duplicate job setting: '+canonical);
        result[canonical]=job[key];
    }
    for(const key of ['sceneFile','phyFile','outputFile','outputDir']) {
        if(result[key]&&!path.isAbsolute(result[key]))result[key]=path.resolve(baseDir,result[key]);
    }
    return result;
}
function readConfig(filename){
    const model=loadDocument(filename);
    if(Array.isArray(model)||model.jobs)throw new Error('Use --batch for jobs manifest');
    if(model.version===1&&Array.isArray(model.objects))return {sceneFile:path.resolve(filename)};
    return normalizeJob(model,path.dirname(path.resolve(filename)));
}
function readBatch(filename){
    const model=loadDocument(filename),baseDir=path.dirname(path.resolve(filename));
    let jobs,defaults={};
    if(Array.isArray(model))jobs=model;
    else{
        if(!Array.isArray(model.jobs))throw new Error('Batch requires a jobs array');
        jobs=model.jobs;
        if(model.defaults!==undefined)defaults=validateJob(model.defaults);
        const extra=Object.keys(model).filter(k=>!['jobs','defaults','version'].includes(k));
        if(extra.length)throw new Error('Unknown batch fields: '+extra.join(', '));
    }
    if(jobs.length===0||jobs.length>100)throw new Error('Batch requires 1..100 jobs');
    return jobs.map((job,index)=>{
        const result=normalizeJob(Object.assign({},defaults,validateJob(job)),baseDir);
        if(!result.outputFile)throw new Error('Batch job '+(index+1)+' must specify an output filename');
        return result;
    });
}
module.exports={loadDocument,validateJob,normalizeJob,readConfig,readBatch};
