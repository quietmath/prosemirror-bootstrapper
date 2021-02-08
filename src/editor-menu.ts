/* eslint-disable no-cond-assign */
import { wrapItem, blockTypeItem, Dropdown, DropdownSubmenu, joinUpItem, liftItem, selectParentNodeItem, undoItem, redoItem, icons, MenuItem } from 'prosemirror-menu';
import { NodeSelection, EditorState } from 'prosemirror-state';
import { NodeType, MarkType } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { toggleMark } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';
import { TextField, openPrompt } from './editor-prompts';
import { Schema } from 'prosemirror-model';
import { insertVideoItem } from './editor-video-plugin';

const canInsert = (state: EditorState, nodeType: NodeType): boolean => {
    const $from = state.selection.$from;
    for (let d = $from.depth; d >= 0; d--) {
        const index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) { 
            return true;
        }
    }
    return false;
};

const insertImageItem = (nodeType: NodeType): void => {
    return new MenuItem({
        title: 'Insert image',
        label: 'Image',
        enable(state: EditorState): boolean {
            return canInsert(state, nodeType);
        },
        run(state: EditorState, _: any, view: EditorView): void {
            const { from, to } = state.selection;
            let attrs = null;
            if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType) {
                attrs = state.selection.node.attrs;
            }
            openPrompt({
                title: 'Insert image',
                fields: {
                    src: new TextField({label: 'Location', required: true, value: attrs && attrs.src}),
                    title: new TextField({label: 'Title', value: attrs && attrs.title}),
                    alt: new TextField({label: 'Description',
                        value: attrs ? attrs.alt : state.doc.textBetween(from, to, ' ')})
                },
                callback(attrs: any): void {
                    view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs)));
                    view.focus();
                }
            });
        }
    });
};

// eslint-disable-next-line @typescript-eslint/ban-types
const cmdItem = (cmd: Function, options: any): MenuItem => {
    const passedOptions = {
        label: options.title,
        run: cmd
    };
    for (const prop in options) {
        passedOptions[prop] = options[prop];
    }
    if ((!options.enable || options.enable === true) && !options.select) {
        passedOptions[options.enable ? 'enable' : 'select'] = (state: EditorState): void => cmd(state);
    }
    return new MenuItem(passedOptions);
};

const markActive = (state: EditorState, type: MarkType): boolean | any => {
    const {from, $from, to, empty} = state.selection;
    if (empty) {
        return type.isInSet(state.storedMarks || $from.marks());
    }
    else {
        return state.doc.rangeHasMark(from, to, type);
    }
};

const markItem = (markType: MarkType, options: any): any => {
    const passedOptions = {
        active(state: EditorState): boolean {
            return markActive(state, markType);
        },
        enable: true
    };
    for (const prop in options) {
        passedOptions[prop] = options[prop];
    }
    return cmdItem(toggleMark(markType), passedOptions);
};

const linkItem = (markType: MarkType): MenuItem => {
    return new MenuItem({
        title: 'Add or remove link',
        icon: icons.link,
        active(state: EditorState): boolean {
            return markActive(state, markType);
        },
        enable(state: EditorState): boolean {
            return !state.selection.empty;
        },
        // eslint-disable-next-line @typescript-eslint/ban-types
        run(state: EditorState, dispatch: Function, view: EditorView): boolean | void {
            if (markActive(state, markType)) {
                toggleMark(markType)(state, dispatch as any);
                return true;
            }
            openPrompt({
                title: 'Create a link',
                fields: {
                    href: new TextField({
                        label: 'Link target',
                        required: true
                    }),
                    title: new TextField({label: 'Title'})
                },
                callback(attrs: any) {
                    toggleMark(markType, attrs)(view.state, view.dispatch);
                    view.focus();
                }
            });
        }
    });
};

const wrapListItem = (nodeType: NodeType, options: any): any => {
    return cmdItem(wrapInList(nodeType, options.attrs), options);
};

const addMoreIcons = (icons: any): void => {
    icons.sup = { dom: document.getElementById('icon-sup') };
    icons.sub = { dom: document.getElementById('icon-sub') };
    icons.u = { dom: document.getElementById('icon-u') };
    icons.big = { dom: document.getElementById('icon-big') };
    icons.small = { dom: document.getElementById('icon-small') };
    icons.mark = { dom: document.getElementById('icon-mark') };
};

export const buildMenuItems = (schema: Schema): any => {
    const r: any = {};
    let type: any;

    addMoreIcons(icons);

    if (type = schema.marks.strong) {
        r.toggleStrong = markItem(type, {title: 'Toggle strong style', icon: icons.strong});
    }
    if (type = schema.marks.em) {
        r.toggleEm = markItem(type, {title: 'Toggle emphasis', icon: icons.em});
    }
    if (type = schema.marks.underline) {
        r.toggleUnderline = markItem(type, {title: 'Toggle underline', icon: icons.u});
    }
    if (type = schema.marks.big_text) {
        r.toggleBig = markItem(type, {title: 'Toggle large text', icon: icons.big});
    }
    if (type = schema.marks.small_text) {
        r.toggleSmall = markItem(type, {title: 'Toggle small text', icon: icons.small});
    }
    if (type = schema.marks.superscript) {
        r.toggleSuperscript = markItem(type, {title: 'Toggle superscript', icon: icons.sup});
    }
    if (type = schema.marks.subscript) {
        r.toggleSubscript = markItem(type, {title: 'Toggle subscript', icon: icons.sub});
    }
    if (type = schema.marks.highlight) {
        r.toggleHighlight = markItem(type, {title: 'Toggle highlight', icon: icons.mark});
    }
    if (type = schema.marks.code) {
        r.toggleCode = markItem(type, {title: 'Toggle code font', icon: icons.code});
    }
    if (type = schema.marks.link) {
        r.toggleLink = linkItem(type);
    }
    if (type = schema.nodes.image) {
        r.insertImage = insertImageItem(type);
    }
    if (type = schema.nodes.video) {
        r.insertVideo = insertVideoItem(type);
    }
    if (type = schema.nodes.bullet_list) {
        r.wrapBulletList = wrapListItem(type, {
            title: 'Wrap in bullet list',
            icon: icons.bulletList
        });
    }
    if (type = schema.nodes.ordered_list) {
        r.wrapOrderedList = wrapListItem(type, {
            title: 'Wrap in ordered list',
            icon: icons.orderedList
        });
    }
    if (type = schema.nodes.blockquote) {
        r.wrapBlockQuote = wrapItem(type, {
            title: 'Wrap in block quote',
            icon: icons.blockquote
        });
    }
    if (type = schema.nodes.paragraph) {
        r.makeParagraph = blockTypeItem(type, {
            title: 'Change to paragraph',
            label: 'Plain'
        });
    }
    if (type = schema.nodes.code_block) {
        r.makeCodeBlock = blockTypeItem(type, {
            title: 'Change to code block',
            label: 'Code'
        });
    }
    if (type = schema.nodes.heading) {
        for (let i = 1; i <= 10; i++) {
            r['makeHead' + i] = blockTypeItem(type, {
                title: 'Change to heading ' + i,
                label: 'Level ' + i,
                attrs: {level: i}
            });
        }
    }
    if (type = schema.nodes.horizontal_rule) {
        const hr = type;
        r.insertHorizontalRule = new MenuItem({
            title: 'Insert horizontal rule',
            label: 'Horizontal rule',
            enable(state: EditorState): boolean {
                return canInsert(state, hr);
            },
            // eslint-disable-next-line @typescript-eslint/ban-types
            run(state: EditorState, dispatch: Function): void {
                dispatch(state.tr.replaceSelectionWith(hr.create()));
            }
        });
    }

    const cut = (arr: any[]): any[] => arr.filter(x => x);
    r.insertMenu = new Dropdown(cut([r.insertImage, r.insertVideo, r.insertHorizontalRule]), {label: 'Insert'});
    r.typeMenu = new Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new DropdownSubmenu(cut([
        r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
    ]), {label: 'Heading'})]), {label: 'Type...'});

    r.inlineMenu = [cut([r.toggleStrong, r.toggleEm, r.toggleUnderline, r.toggleBig, r.toggleSmall, r.toggleHighlight, r.toggleSuperscript, r.toggleSubscript, r.toggleCode, r.toggleLink])];
    r.blockMenu = [cut([r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, joinUpItem, liftItem, selectParentNodeItem])];
    r.fullMenu = r.inlineMenu.concat([[r.insertMenu, r.typeMenu]], [[undoItem, redoItem]], r.blockMenu);

    return r;
};
