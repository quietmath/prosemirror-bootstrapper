import { EditorState, Plugin, Transaction, NodeSelection } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Schema, NodeType, Node } from 'prosemirror-model';
import { MenuItem }  from 'prosemirror-menu';

const canInsertImage = (state: EditorState, nodeType: NodeType): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d -= 1) {
        const index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) {
            return true;
        }
    }
    return false;
};

const uploadImageToServer = async (file: File): Promise<any[]> => {
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

const uploadImage = async (file: File): Promise<any[]> => {
    const reader = new FileReader();
    try {
        const [url, fileName] = await uploadImageToServer(file);
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

const getFontSize = (element: any): number => {
    return parseFloat(getComputedStyle(element).fontSize);
};

export const image = {
    inline: true,
    attrs: {
        src: {},
        width: {default: '2em'},
        alt: {default: null},
        title: {default: null}
    },
    group: 'inline',
    draggable: true,
    parseDOM: [{tag: 'img[src]', getAttrs(dom: any): any {
        return {
            src: dom.getAttribute('src'),
            title: dom.getAttribute('title'),
            alt: dom.getAttribute('alt'),
            width: dom.getAttribute('width')
        };
    }}],
    toDOM(node: any): any {
        const attrs = {style: `width: ${ node.attrs.width }`};
        return ['img', { ...node.attrs, ...attrs }]; 
    }
};

export const replaceImageNode = (nodes: any, img: any): any => {
    const pos = nodes.content.indexOf('image');
    nodes.content[pos + 1] = img;
    return nodes;
};

export const imagePlaceholderPlugin = new Plugin({
    state: {
        init(): any {
            return DecorationSet.empty;
        },
        apply(tr: Transaction<any>, set: any): any {
            set = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta(this);
            if (action && action.add) {
                const widget = document.createElement('image-placeholder');
                const deco = Decoration.widget(action.add.pos, widget, {id: action.add.id});
                set = set.add(tr.doc, [deco]);
            }
            else if (action && action.remove) {
                set = set.remove(set.find(null, null, spec => spec.id == action.remove.id));
            }
            return set;
        }
    },
    props: {
        decorations(state: EditorState): any {
            return this.getState(state);
        }
    }
});

const findImagePlaceholder = (state: EditorState, id: any): number => {
    const decos = imagePlaceholderPlugin.getState(state);
    const found = decos.find(null, null, spec => spec.id == id);
    return found.length ? found[0].from : null;
};

export class ImageResizeView {
    private dom: HTMLSpanElement;
    private img: HTMLImageElement;
    private handle: HTMLSpanElement;
    constructor(node: Node, view: EditorView, getPos: Function) {    
        const outer = document.createElement('span');
        outer.style.position = 'relative';
        outer.style.width = node.attrs.width;
        outer.style.display = 'inline-block';
        outer.style.lineHeight = '0';

        const img = document.createElement('img');
        img.setAttribute('src', node.attrs.src);
        img.style.width = '100%';

        const handle = document.createElement('span');
        handle.style.position = 'absolute';
        handle.style.bottom = '0px';
        handle.style.right = '0px';
        handle.style.width = '10px';
        handle.style.height = '10px';
        handle.style.border = '3px solid black';
        handle.style.borderTop = 'none';
        handle.style.borderLeft = 'none';
        handle.style.display = 'none';
        handle.style.cursor = 'nwse-resize';

        handle.onmousedown = function(e: any): void {
            e.preventDefault();
        
            const startX = e.pageX;
            //const startY = e.pageY;
            const fontSize = getFontSize(outer);
            const width = node.attrs.width || '10em';
            const startWidth = parseFloat(width.match(/(.+)em/)[1]);
              
            const onMouseMove = (e: any): void => {
                const currentX = e.pageX;
                //const currentY = e.pageY;
                const diffInPx = currentX - startX;
                const diffInEm = diffInPx / fontSize;
                  
                outer.style.width = `${ startWidth + diffInEm }em`;
            };

            const onMouseUp = (e: any): void => {        
                e.preventDefault();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const currentPos = getPos();
                const transaction = view.state.tr.setNodeMarkup(getPos(), null, { src: node.attrs.src, width: outer.style.width });
                const resolved = transaction.doc.resolve(currentPos);
                const select = new NodeSelection(resolved);
                transaction.setSelection(select);
                view.dispatch(transaction);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
      
        outer.appendChild(handle);
        outer.appendChild(img);
          
        this.dom = outer;
        this.img = img;
        this.handle = handle;
    }
    public selectNode(): void {
        this.img.classList.add('ProseMirror-selectednode');
        this.handle.style.display = '';
    }
    public deselectNode(): void {
        this.img.classList.remove('ProseMirror-selectednode');
        this.handle.style.display = 'none';
    }
}

export const startImageUpload = (view: EditorView, file: File): void => {
    const id = { };

    const tr = view.state.tr;
    if (!tr.selection.empty) {
        tr.deleteSelection();
    }
    tr.setMeta(imagePlaceholderPlugin, {
        add: {
            id, pos: tr.selection.from
        }
    });
    view.dispatch(tr);

    uploadImage(file).then((result: any[]): void => {
        const pos = findImagePlaceholder(view.state, id);
        if (pos == null) {
            return;
        }
        view.dispatch(view.state.tr
            .replaceWith(pos, pos, view.state.schema.nodes.image.create({ src: result[0] }))
            .setMeta(imagePlaceholderPlugin, {remove: { id }}));
    }, () => {
        view.dispatch(tr.setMeta(imagePlaceholderPlugin, {remove: { id }}));
    });
};

export const insertImageMenuItem = (menu: any, imageSelectorID: string, schema: Schema): void => {
    const imgMenuItem = new MenuItem({
        label: 'Upload image',
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        select: (state: EditorState): boolean => canInsertImage(state, schema.nodes.image),
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        run() {
            document.getElementById(imageSelectorID)?.click();
        },
    });
    menu[1][0].content.push(imgMenuItem);
    menu[1][0].content.shift();
};
