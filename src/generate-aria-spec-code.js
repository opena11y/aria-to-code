/* generate-aria-spec-code.js */
/* aria-to-code generator version 1.1 */


import fs    from 'fs';
import os    from 'os';
import path  from 'path';
import util  from 'util';
import fetch from 'node-fetch';
import HTMLParser from 'node-html-parser';

const ariaVersion = '1.3';

const ariaInfoFilename          = path.join('releases', `gen-aria-info-${ariaVersion}.js`);
const ariaInfoFilenameJSON      = path.join('releases', `gen-aria-info-${ariaVersion}.json`);
const designPatternsFilename    = path.join('releases', `gen-aria-role-design-patterns-${ariaVersion}.js`);
const propertyDataTypesFilename = path.join('releases', `gen-aria-property-data-types-${ariaVersion}.js`);

let ariaURL = `https://www.w3.org/TR/wai-aria-${ariaVersion}/`;

const treegridOnlyProps = [
  'aria-expanded',
  'aria-posinset',
  'aria-setsize',
  'aria-level'
];

function getRoleType(elem) {
  let superClasses = [];
  let  refs = elem.querySelectorAll('tbody tr:nth-child(1) .role-reference');
  if (refs.length === 0) {
    refs = elem.querySelectorAll('tbody tr:nth-child(2) .role-reference');
  }
  if (refs.length) {
    for (let i = 0; i < refs.length; i += 1) {
      let ref = refs[i];
      if (ref) {
        superClasses.push(ref.textContent.trim());
      }
    }
  } else {
    superClasses.push('unknown');
  }
  return superClasses.join(" ");
}

function isAbstract(elem) {
  if (elem.querySelector('.role-abstract')) {
    return true;
  }
  return false;
}

function isDeprecated(node) {
  if (node.querySelector('strong')) {
    return true;
  }
  return false;
}

function getList(node) {
  let nodes = node.querySelectorAll('li');
  if (nodes && nodes.length) {
    return nodes;
  }
  return false;
}

function getListOfValues(elemNode, selector) {
  let values = [];

  let node = elemNode.querySelector(selector);
  if (node) {
    let listItems = getList(node);
    if (listItems && listItems.length) {
      for (let j = 0; j < listItems.length; j += 1) {
        let value = listItems[j].textContent.toLowerCase().trim();
        value = value.split(' ')[0];
        if (!values.includes(value)) {
          values.push(value);
        }
      }
    } else {
      values.push(node.textContent.trim());
    }
  }
  return values;
}


function hasValue(value, elemNode, selector) {

  let node = elemNode.querySelector(selector);
  if (node) {
    return node.textContent.toLowerCase().indexOf(value) >= 0;
  }
  return false;
}

function getRoles(dom, roles, rolesWithRequiredChildren, rolesWithRequiredParents, rolesWithNameProhibited, rolesWithDeprecatedAttributes, attributesThatMaybeDeprecated, rolesThatAllowNameFromContents) {

  let elems = dom.querySelectorAll('section.role');

  for (let i = 0; i < elems.length; i += 1) {
    let elem = elems[i];
    let  role = elem.querySelector('h4.role-name code').textContent.trim();

    if ((role === 'roletype' || role === 'image') ||
        (ariaVersion === '1.2' && role === 'none') ||
        (ariaVersion === '1.3' && role === 'presentation')) {
      continue;
    }

    roles[role] = {};

    roles[role].inheritedProps = [];
    roles[role].deprecatedProps = [];

    roles[role].supportedProps = [];
    roles[role].hasRange = false;

    roles[role].requiredProps = [];

    roles[role].nameRequired = false;
    roles[role].nameFromContent = false;
    roles[role].nameProhibited = false;

    roles[role].childrenPresentational = false;

    roles[role].requiredParents = [];
    roles[role].requiredChildren = [];
    roles[role].roleType = getRoleType(elem);
    roles[role].isAbstract = isAbstract(elem);

    console.log('[role]: ' + role + ' (' + roles[role].roleType + ') ' + (roles[role].isAbstract ? 'ABSTRACT' : ''));

    let ariaAttributeNodes = dom.querySelectorAll('#' + role + ' .role-inherited li');

    for (let j = 0; j < ariaAttributeNodes.length; j += 1) {
      let ariaAttributeNode = ariaAttributeNodes[j];
      let ariaAttribute = ariaAttributeNode.querySelector('code').textContent;

      roles[role].inheritedProps.push(ariaAttribute);

      if (isDeprecated(ariaAttributeNode)) {
        roles[role].deprecatedProps.push(ariaAttribute);

        if (attributesThatMaybeDeprecated.indexOf(ariaAttribute) < 0) {
          attributesThatMaybeDeprecated.push(ariaAttribute);
        }
      }
    }

    if (roles[role].deprecatedProps.length) {
      rolesWithDeprecatedAttributes.push(role);
    }

    ariaAttributeNodes = dom.querySelectorAll(`#${role} .role-required-properties li`);
    if (ariaAttributeNodes.length === 0) {
      ariaAttributeNodes = dom.querySelectorAll(`#${role} .role-required-properties`);
    }

    for (let j = 0; j < ariaAttributeNodes.length; j += 1) {
      let ariaAttributeNode = ariaAttributeNodes[j];
      let ariaAttribute = ariaAttributeNode.querySelector('code').textContent;

      roles[role].requiredProps.push(ariaAttribute);
      roles[role].inheritedProps.push(ariaAttribute);
    }

    ariaAttributeNodes = dom.querySelectorAll('#' + role + ' .role-properties li');

    for (let j = 0; j < ariaAttributeNodes.length; j += 1) {
      let ariaAttributeNode = ariaAttributeNodes[j];
      let ariaAttribute = ariaAttributeNode.querySelector('code').textContent;

      roles[role].supportedProps.push(ariaAttribute);
      roles[role].inheritedProps.push(ariaAttribute);
    }

    let nameRequiredNode = dom.querySelector('#' + role + ' .role-namerequired');
    if (nameRequiredNode) {
      if (nameRequiredNode.textContent.trim().toLowerCase().indexOf('true') >= 0) {
        roles[role].nameRequired = true;
      }
    }
    // Fix for tab role
    if (role === 'tab') {
        roles[role].nameRequired = true;
    }

    let childrenPresentationalNode = dom.querySelector('#' + role + ' .role-childpresentational');
    if (childrenPresentationalNode) {
      if (childrenPresentationalNode.textContent.trim().toLowerCase().indexOf('true') >= 0) {
        roles[role].childrenPresentational = true;
      }
    }

    roles[role].requiredParents = getListOfValues(dom, '#' + role + ' .role-scope');
    if (roles[role].requiredParents.length > 0) {
      rolesWithRequiredParents.push(role);
    }
    roles[role].requiredChildren = getListOfValues(dom, '#' + role + ' .role-mustcontain');
    if (roles[role].requiredChildren.length > 0) {
      rolesWithRequiredChildren.push(role);
    }

    roles[role].nameFromContent = hasValue ('content', dom, '#' + role + ' .role-namefrom');

    if (roles[role].nameFromContent) {
      rolesThatAllowNameFromContents.push(role)
    }

    roles[role].nameProhibited = hasValue ('prohibited', dom, '#' + role + ' .role-namefrom');
    if (roles[role].nameProhibited) {
      rolesWithNameProhibited.push(role);
    }


    if (role === 'separator') {
      roles['separatorFocusable'] = Object.assign({}, roles['separator']);

      roles['separator'].roleType = 'structure';
      roles['separatorFocusable'].roleType = 'widget range';

      roles['separator'].supportedProps = ['aria-orientation'];
      roles['separator'].requiredProps  = [];

    }

    if (role === 'row') {
      roles['rowGrid'] = Object.assign({}, roles['row']);

      roles['row'].roleType     = 'structure';

      roles['rowGrid'].roleType = 'widget';
      roles['rowGrid'].inheritedProps = [...roles['rowGrid'].inheritedProps];
      roles['rowGrid'].supportedProps = [...roles['row'].supportedProps];

      roles['rowTreegrid'] = Object.assign({}, roles['rowGrid']);
      roles['rowTreegrid'].supportedProps = [...roles['row'].supportedProps];

      treegridOnlyProps.forEach( prop => {
        const index = roles['row'].supportedProps.indexOf(prop);
        console.log(`[${prop}: ${index}`);
        if (index >= 0) {
          roles['row'].supportedProps.splice(index, 1);
          roles['rowGrid'].supportedProps.splice(index, 1);
        }
      })

      const index = roles['row'].inheritedProps.indexOf('aria-disabled');
      roles['row'].inheritedProps.splice(index, 1);
    }

  }

  // Update the roleType to abstract roles

  function getAbstractRoles(role) {

    if (role === 'live') {
      return '';
    }

    let roleTypes = '';

    if (' structure range widget window landmark abstact'.indexOf(role) > 0) {
      roleTypes = role + ' ';
    } else {
      if (role.length) {
        let refs = roles[role].roleType.split(' ');

        for (let i = 0; i < refs.length; i++) {
          let ref = refs[i];
          roleTypes += getAbstractRoles(ref);
        }
      }
    }

    return roleTypes;

  }

  function removeDuplicates(roles) {
    const newItems = [];
    const items = roles.split(' ');

    for (let i = 0; i < items.length; i += 1) {
      let item = items[i].trim();
      if (newItems.indexOf(item) < 0) {
        newItems.push(item);
      }
    }

    return newItems.join(' ').trim();
  }

  for (let role in roles) {
    // fix roles that do not have widget as a base class
    if ('application log marquee tabpanel timer tooltip'.indexOf(role) >= 0) {
      roles[role].roleType += ' widget';
    }

    console.log('\n[' + role + '][roleType]: ' + roles[role].roleType);

    let abstractRoles = getAbstractRoles(role);
    if ('alert log marquee status timer'.indexOf(role) >= 0) {
      abstractRoles += 'live';
    }

    if ('article cell'.indexOf(role) >= 0) {
      abstractRoles += 'section';
    }

    roles[role].roleType = removeDuplicates(abstractRoles);

    if (roles[role].roleType.indexOf('range') >= 0) {
      roles[role].hasRange = true;
    }

    console.log('[' + role + '][roleType]: ' + roles[role].roleType);
  }

  for (let role in roles) {
    if (roles[role].isAbstract) {
      roles[role].roleType = 'abstract';
      console.log('[' + role + '][roleType]: ' + roles[role].roleType);
    }
  }
}


function getIDLInformation(elemNode, selector) {
  let dict = {};

  let nodes = elemNode.querySelectorAll(selector);
  for (let i = 0; i < nodes.length; i += 1) {
    let node = nodes[i];
    let idl = node.querySelector('td:nth-child(1)');
    let attr = node.querySelector('td:nth-child(2)');

    if (idl && attr) {
      console.log('[getIDLInformation][' + attr.textContent + ']: ' + idl.textContent);
      dict[attr.textContent] = idl.textContent.trim();
    }
  }
  return dict;
}


function getPropValues(elemNode, selector) {
  let values = [];

  let defaultValue = '';

  let nodes = elemNode.querySelectorAll(selector);
  for (let j = 0; j < nodes.length; j += 1) {
    let value = nodes[j].textContent.toLowerCase().trim();
    let parts = value.split(' ');
    let value1 = parts[0];
    values.push(value1);
    if (value.indexOf('default') >= 0) {
      defaultValue = value1;
    }
  }

  return [values, defaultValue];
}

function getPropType(elemNode, selector) {
  let node = elemNode.querySelector(selector);
  let type = node.textContent.toLowerCase().trim();

  switch (type) {
    case 'true/false':
      type = 'boolean';
      break;

    case 'id reference':
      type = 'idref';
      break;

    case 'id reference list':
      type = 'idrefs';
      break;

    case 'token':
    case 'true/false/undefined':
      type = 'nmtoken';
      break;

    case 'token list':
      type = 'nmtokens';
      break;

    default:
      break;
  }

  return type;
}

function isPropDeprecated(elemNode, selector) {
  let node = elemNode.querySelector(selector);
  let content = node.textContent.toLowerCase().trim();

  return content.indexOf('deprecated') >= 0;
}


function getProps(dom, props) {

  let idlAttributes = getIDLInformation(dom, '#reflection table tr');

  let elems = dom.querySelectorAll('section.property h4 code, section.state h4 code');

  for (let i = 0; i < elems.length; i += 1) {
    let elem = elems[i];
    let prop = elem.textContent.toLowerCase().trim();

    console.log('[prop]: ', prop);

    props[prop] = {};
    props[prop].propType = dom.querySelector('#' + prop + ' h4 .type-indicator').textContent.toLowerCase().trim();
    props[prop].type = getPropType(dom, '#' + prop + ' .state-value, #' + prop + ' .property-value');
    if (props[prop].type === 'integer') {
      let codeElems = dom.querySelectorAll('#' + prop + ' .property-description code');
      let flag = false;
      for (let i = 0; i < codeElems.length && !flag; i += 1) {
        if (codeElems[i].textContent === "-1") {
          flag = true;
        }
      }
      props[prop].allowUndeterminedValue = flag;
    }
    [props[prop].values, props[prop].defaultValue] = getPropValues(dom, '#' + prop + ' .value-name');

    if (prop === 'aria-valuemax') {
      props[prop].defaultValue = '100';
    }

    if (prop === 'aria-valuemin') {
      props[prop].defaultValue = '0';
    }

    props[prop].deprecated = isPropDeprecated(dom, ('#desc-' + prop + ' p'));
    props[prop].idlAttribute = idlAttributes[prop] ? idlAttributes[prop] : '';

  }
}

function getAriaInformation(dom) {
  const ariaInfo = {};
  ariaInfo.title = dom.querySelector('h1.title').textContent;
  ariaInfo.status = dom.querySelector('h1.title + p').textContent.trim().replace('\n', '');
  ariaInfo.reference = ariaURL;
  ariaInfo.propertyDataTypes = {};
  ariaInfo.designPatterns = {};
  ariaInfo.rolesWithRequiredChildren = [];
  ariaInfo.rolesWithRequiredParent = [];
  ariaInfo.rolesWithNameProhibited = [];
  ariaInfo.rolesWithDeprecatedAttributes = [];
  ariaInfo.attributesThatMaybeDeprecated = [];
  ariaInfo.rolesThatAllowNameFromContents = [];

  getRoles(dom, ariaInfo.designPatterns, ariaInfo.rolesWithRequiredChildren, ariaInfo.rolesWithRequiredParent, ariaInfo.rolesWithNameProhibited, ariaInfo.rolesWithDeprecatedAttributes, ariaInfo.attributesThatMaybeDeprecated, ariaInfo.rolesThatAllowNameFromContents);

  if (ariaVersion === '1.2') {
    ariaInfo.designPatterns['none']  = ariaInfo.designPatterns['presentation'];
    ariaInfo.rolesWithNameProhibited.push('none');
  }
  else {
    ariaInfo.designPatterns['presentation']  = ariaInfo.designPatterns['none'];
    ariaInfo.rolesWithNameProhibited.push('presentation');
    ariaInfo.designPatterns['image'] = ariaInfo.designPatterns['img'];
  }

  getProps(dom, ariaInfo.propertyDataTypes);

  return ariaInfo
}

function outputAsJSON(filename, info) {

  fs.writeFile(filename, JSON.stringify(info, null, 4), err => {
    if (err) {
      console.error(err)
      return
    }
    //file written successfully
  })

  return info;
}

function outputAsJSObject(filename, constName, info, data) {
  const exportPrefix = `/* ${path.basename(filename)} is a generated file, see https://github.com/opena11y/aria-to-code */\nexport const ${constName} = `;
  const exportSuffix = `;${os.EOL}`;

  fs.writeFile(filename, exportPrefix + util.inspect(data, { compact: false, depth: null }) + exportSuffix, err => {
    if (err) {
      console.error(err)
      return
    } else {
      console.log(`[${filename}]: ${data}`);
    }
  });
  console.log(`[designPattern][2]: ${info.designPatterns}`);
  return info;
}

fetch(ariaURL)
  .then(data => data.text())
  .then(html => HTMLParser.parse(html))
  .then(dom => getAriaInformation(dom))
  .then(ariaInfo => outputAsJSON(ariaInfoFilenameJSON, ariaInfo))
  .then(ariaInfo => outputAsJSObject(ariaInfoFilename,          'ariaInfo',          ariaInfo, ariaInfo))
  .then(ariaInfo => outputAsJSObject(propertyDataTypesFilename, 'propertyDataTypes', ariaInfo, ariaInfo.propertyDataTypes))
  .then(ariaInfo => outputAsJSObject(designPatternsFilename,    'designPatterns',    ariaInfo, ariaInfo.designPatterns))
