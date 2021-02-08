import { EditorState, NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { NodeType } from 'prosemirror-model';
import { MenuItem }  from 'prosemirror-menu';
import { openPrompt, TextField } from './editor-prompts';

const canInsertVideo = (state: EditorState, nodeType: NodeType): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d -= 1) {
        const index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) {
            return true;
        }
    }
    return false;
};

export const insertVideoItem = (nodeType: NodeType): MenuItem => {
    return new MenuItem({
        title: 'Insert video URL',
        label: 'Insert video URL',
        enable(state: EditorState): boolean {
            return canInsertVideo(state, nodeType);
        },
        run(state: EditorState, _: any, view: EditorView): void {
            let attrs = null;
            if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType) {
                attrs = state.selection.node.attrs;
            }
            openPrompt({
                title: 'Insert video URL',
                fields: {
                    src: new TextField({ label: 'URL', required: true, value: attrs && attrs.src }),
                    title: new TextField({ label: 'Title', value: attrs && attrs.title })
                },
                callback(attrs: any) {
                    attrs.type = attrs.type || 'video/mp4';
                    view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs)));
                    view.focus();
                }
            });
        }
    });
};

const video = {
    attrs: {
        src: {},
        type: {}
    },
    group: 'block',
    draggable: true,
    parseDOM: [{tag: 'video', getAttrs(dom: any): any {
        const source = dom.querySelector('source');
        return {
            src: source.getAttribute('src'),
            type: source.getAttribute('type')
        };
    }}],
    toDOM(node: any): any {
        const { src, type } = node.attrs;
        return ['video', { controls: '', draggable: 'false'}, ['source', { src, type: type || 'video/mp4' }]];
    }
};

export const insertVideoNode = (nodes: any): any => {
    return nodes.addToEnd('video', video);
};
