"""Source inventory comparison retained from the native-content archive; no browser execution."""
import math
def readiness(expected,observed):
    # Keep version-dependent observations explicit. Early captures used association
    # indices; later captures additionally preserve original node names/relations.
    issues=[]
    check=lambda ok,label:issues.append(label) if not ok else None
    check(observed['contextsLost']==[False,False],'contextsLost')
    for key,field in [('materialIndices','index'),('imageIndices','imageIndex')]:
        rows=observed['materials'] if key=='materialIndices' else observed['textures'];actual=sorted(set(x[field] for x in rows));check(actual==expected[key],key)
    check(all(x['ready'] for x in observed['textures']),'decodedTextureReadiness')
    clips=[{'name':x['name'],'tracks':x['tracks']} for x in observed['clips']];want=[{'name':x['nativeName'],'tracks':x['channels']} for x in expected['animations']];check(clips==want,'authoredClips')
    counts={'sourceNodes':expected['nodes'],'observedNodeAssociationIndices':len(observed['nodeIndices']),'materials':len(set(x['index'] for x in observed['materials'])),'decodedImageDefinitions':len(set(x['imageIndex'] for x in observed['textures'])),'clips':len(observed['clips'])}
    if 'nodeRecords' in expected and 'nodeRecords' in observed:
        actual={x['name']:x for x in observed['nodeRecords']};check(len(actual)==len(observed['nodeRecords']),'duplicateNodeName');check(set(actual)=={x['name'] for x in expected['nodeRecords']},'nodeNames')
        for row in expected['nodeRecords']:
            got=actual.get(row['name'])
            if got is None:continue
            for key in ['parentName','childNames','meshIndex','primitives']:check(got[key]==row[key],'node.'+row['name']+'.'+key)
            if not row['animated']:
                keys=['matrix'] if row['matrix'] else ['translation','rotation','scale']
                for key in keys:
                    if len(got[key])!=len(row[key]) or any(not math.isfinite(x) or abs(x-y)>1e-10+1e-12*abs(y) for x,y in zip(got[key],row[key])):issues.append('node.'+row['name']+'.'+key)
        for row in expected['materials']:
            for got in [x for x in observed['materials'] if x['index']==row['index']]:
                check([x['slot'] for x in got['textureSlots']]==[x['slot'] for x in row['textureSlots']],'materialSlots')
                for wanted in row['textureSlots']:
                    matches=[x for x in got['textureSlots'] if x['slot']==wanted['slot']]
                    if not matches:continue
                    for key in ['imageIndex','imageURI','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer']:check(matches[0][key]==wanted[key],'texture.'+key)
                for key in ['transmission','thickness']:check(got[key]==row[key],'material.'+key)
                if row['hasVolume']:
                    for key in ['attenuationDistance','attenuationColor']:check(got[key]==row[key],'material.'+key)
                if row['hasSpecular']:
                    for key in ['specularIntensity','specularColor']:check(got[key]==row[key],'material.'+key)
        counts['originalNameInstances']=len(actual)
    else:
        counts['originalNameInstanceAudit']='Unavailable in this older capture schema; association IDs are not unique node/material-image identity.'
        counts['oldNodeAssociationMismatch']=observed['nodeIndices']!=expected['nodeIndices']
        counts['oldTextureAssociationMismatch']=sorted(set(x['index'] for x in observed['textures']))!=expected['textureIndices']
    return {'issues':issues,'counts':counts}
