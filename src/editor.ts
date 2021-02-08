/* eslint-disable @typescript-eslint/ban-ts-comment */
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Fragment, DOMSerializer } from 'prosemirror-model';
import { schema as baseSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap }  from 'prosemirror-keymap';
import { MenuItem, Dropdown }  from 'prosemirror-menu';
import * as tbl from 'prosemirror-tables';
import { exampleSetup } from 'prosemirror-example-setup';
import { startFileUpload, insertFileMenuItem, filePlaceholderPlugin } from './editor-file-plugin';
import { startImageUpload, insertImageMenuItem, imagePlaceholderPlugin, ImageResizeView, replaceImageNode, image } from './editor-image-plugin';
import { addMoreMarks } from './editor-marks';
import { buildMenuItems } from './editor-menu';
import { insertVideoNode } from './editor-video-plugin';
import { ProseEditorOptions } from './schema';

export class ProseEditor {
    private _editorID: string;
    private _contentID: string;
    private _imageSelectorID: string;
    private _btnSelectorID: string;
    private _formTargetID: string;
    constructor(options: ProseEditorOptions) {
        this._editorID = options.editorID;
        this._contentID = options.contentID;
        this._imageSelectorID = options.imageSelectorID;
        this._formTargetID = options.formTargetID;
    }
    public create(): EditorView {

        if(this._imageSelectorID != null) {
            const imageSelector = document.querySelector(`#${ this._imageSelectorID }`);
            imageSelector.addEventListener('change', function(e) {
                const view = window['view'];
                if (view.state.selection.$from.parent.inlineContent && (e.target as any).files.length) {
                    const file = (e.target as any).files[0];
                    if (/^image\//.test(file.type)) {
                        startImageUpload(view, (e.target as any).files[0]);
                    } else {
                        startFileUpload(view, (e.target as any).files[0]);
                    }
                }
                view.focus();
            });
        }
    
        if(this._btnSelectorID != null) {
            const btnSelector = document.querySelector(`#${ this._btnSelectorID }`);
            btnSelector.addEventListener('click', function(e) {
                e.preventDefault();
                const scratch = document.createElement('div');
                scratch.appendChild(DOMSerializer.fromSchema((window['view'] as EditorView).state.schema).serializeFragment((window['view'] as EditorView).state.doc.content));
                (document.querySelector(`#${ this._formTargetID }`) as HTMLInputElement).value = scratch.innerHTML;
                const form: HTMLFormElement = btnSelector.closest('form');
                if(form.checkValidity()) {
                    btnSelector.closest('form').submit();
                }
                else {
                    form.reportValidity();
                }
            });
        }
    
        const createMenuItem = (label: string, cmd: any): MenuItem => {
            return new MenuItem({
                label: label,
                select: cmd,
                run: cmd
            });
        };
    
        // eslint-disable-next-line @typescript-eslint/ban-types
        const insertTable = (state: EditorState, dispatch: Function): boolean => {
            const tr = state.tr.replaceSelectionWith(
                state.schema.nodes.table.create(
                    undefined,
                    Fragment.fromArray([
                        state.schema.nodes.table_row.create(undefined, Fragment.fromArray([
                            state.schema.nodes.table_cell.createAndFill(),
                            state.schema.nodes.table_cell.createAndFill()
                        ]))
                    ])
                )
            );
            if (dispatch) {
                dispatch(tr);
            }
            return true;
        };
        
        const insertTableMenuItems = (menu: any): void => {
            const tableMenu = [
                createMenuItem('Insert table', insertTable),
                createMenuItem('Insert column before', tbl.addColumnBefore),
                createMenuItem('Insert column after', tbl.addColumnAfter),
                createMenuItem('Delete column', tbl.deleteColumn),
                createMenuItem('Insert row before', tbl.addRowBefore),
                createMenuItem('Insert row after', tbl.addRowAfter),
                createMenuItem('Delete row', tbl.deleteRow),
                createMenuItem('Delete table', tbl.deleteTable),
                createMenuItem('Merge cells', tbl.mergeCells),
                createMenuItem('Split cell', tbl.splitCell),
                createMenuItem('Toggle header column', tbl.toggleHeaderColumn),
                createMenuItem('Toggle header row', tbl.toggleHeaderRow),
                createMenuItem('Toggle header cells', tbl.toggleHeaderCell),
                createMenuItem('Make cell green', tbl.setCellAttr('background', '#dfd')),
                createMenuItem('Make cell not-green', tbl.setCellAttr('background', null))
            ];
            menu.splice(2, 0, [ new Dropdown(tableMenu, { label: 'Table' }) ]);
        };
    
        replaceImageNode(baseSchema.spec.nodes, image);
        let editorNodes = insertVideoNode(baseSchema.spec.nodes);
        editorNodes = addListNodes(editorNodes, 'paragraph block*', 'block');
        const editorMarks = addMoreMarks(baseSchema.spec.marks);
    
        const mySchema = new Schema({
            nodes: (editorNodes as any).append(tbl.tableNodes({
                tableGroup: 'block',
                cellContent: 'block+',
                cellAttributes: {
                    background: {
                        default: null,
                        getFromDOM(dom: HTMLElement): string {
                            return dom.dataset.colwidth || null;
                        },
                        setDOMAttr(value, attrs): void {
                            if (value) {
                                attrs.style = (attrs.style || '') + `width: ${ value }px;`;
                            }
                        }
                    }
                }
            })),
            marks: editorMarks
        });
    
        const menu = buildMenuItems(mySchema).fullMenu;
        insertTableMenuItems(menu);
        insertImageMenuItem(menu, this._imageSelectorID, mySchema);
        insertFileMenuItem(menu, this._imageSelectorID, mySchema);
    
        const doc = DOMParser.fromSchema(mySchema).parse(document.querySelector(`#${ this._contentID }`));
        let state = EditorState.create({
            doc,
            plugins: [
                tbl.columnResizing({}),
                tbl.tableEditing(),
                keymap({
                    'Tab': tbl.goToNextCell(1),
                    'Shift-Tab': tbl.goToNextCell(-1)
                })
            ].concat(exampleSetup({
                schema: mySchema,
                menuContent: menu
            })).concat(imagePlaceholderPlugin)
                .concat(filePlaceholderPlugin)
        });
        const fix = tbl.fixTables(state);
        if (fix) {
            state = state.apply(fix.setMeta('addToHistory', false));
        }
    
        return new EditorView(document.querySelector(`#${ this._editorID }`), {
            state: state,
            nodeViews: {
                //@ts-ignore
                // eslint-disable-next-line @typescript-eslint/ban-types
                image(node: any, view: EditorView, getPos: Function): ImageResizeView {
                    return new ImageResizeView(node, view, getPos);
                }
            }
        });
    }
}
