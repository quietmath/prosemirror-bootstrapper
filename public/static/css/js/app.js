/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const { Editor } = require('../../../../dist/index');

const editors = document.querySelectorAll('[data-m-editor]');
editors.forEach((editor) => {
    const editorID = editor.getAttribute('id');
    const contentID = editor.getAttribute('data-editor');
    const formTargetID = editor.getAttribute('data-target');
    const btnSaveID = editor.getAttribute('data-button');
    window[editorID] = new Editor({
        editorID: editorID,
        contentID: contentID,
        imageSelectorID: 'image-selector',
        formTargetID: formTargetID,
        btnSaveID: btnSaveID
    });
    //createEditor(editorID, contentID, 'image-selector', btnSaveID, formTargetID);
});

document.execCommand('enableObjectResizing', false, false);
document.execCommand('enableInlineTableEditing', false, false);
