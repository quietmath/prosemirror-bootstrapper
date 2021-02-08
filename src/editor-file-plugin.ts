import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView, DecorationSet} from 'prosemirror-view';
import { Schema, NodeType } from 'prosemirror-model';
import { MenuItem }  from 'prosemirror-menu';

const canInsertFile = (state: EditorState, nodeType: NodeType): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d -= 1) {
        const index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) {
            return true;
        }
    }
    return false;
};

const uploadFileToServer = async (file: File): Promise<any[]> => {
    const fileElement = document.querySelector(`[type="file"]`);
    const url = fileElement.getAttribute('data-m-url');
    const fd = new FormData();
    fd.append('image', file);

    const result = await fetch(`${ url }`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        body: fd
    });

    const data = await result.json();
    if(!data.success) {
        console.error(`An error has occurred: ${ data.message }`);
    }
    else {
        return [data.url, data.fileName];
    }
    return null;
};

const uploadFile = async (file: File): Promise<any[]> => {
    const reader = new FileReader();
    try {
        const [url, fileName] = await uploadFileToServer(file);
        if(url != null) {
            return [url, fileName];
        }
    }
    catch(e) {
        console.error(e);
    }
    return new Promise((resolve, reject) => {
        reader.onload = (): void => {
            resolve(reader.result as any);
        };
        reader.onerror = (): void => {
            reject(reader.error);
        };
        setTimeout(() => reader.readAsDataURL(file), 1500);
    });
};

export const filePlaceholderPlugin = new Plugin({
    state: {
        init(): any {
            return DecorationSet.empty;
        },
        apply(tr: Transaction<any>, set: any): any {
            return set.map(tr.mapping, tr.doc);
        }
    },
    props: {
        decorations(state): any {
            return this.getState(state);
        }
    }
});

export const startFileUpload = (view: EditorView, file: File): void => {
    const id = { };

    const tr = view.state.tr;
    if (!tr.selection.empty) {
        tr.deleteSelection();
    }
    tr.setMeta(filePlaceholderPlugin, {
        add: {
            id, pos: tr.selection.from
        }
    });
    view.dispatch(tr);

    uploadFile(file).then((result: any[]): void => {
        const attrs = { title: result[1], href: result[0] };
        const node = view.state.schema.text(attrs.title, [view.state.schema.marks.link.create(attrs)]);
        view.dispatch(view.state.tr.replaceSelectionWith(node, false));
    }, () => {
        view.dispatch(tr.setMeta(filePlaceholderPlugin, { remove: { id } }));
    });
};

export const insertFileMenuItem = (menu: any, fileSelectorID: string, schema: Schema): void => {
    const fileMenuItem = new MenuItem({
        label: 'Upload file',
        select: (state: EditorState): boolean => canInsertFile(state, schema.nodes.image), //Should this just use state???
        run(): void {
            document.getElementById(fileSelectorID)?.click();
        },
    });
    menu[1][0].content.push(fileMenuItem);
};
