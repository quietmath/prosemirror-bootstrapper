/* eslint-disable @typescript-eslint/no-use-before-define */
const prefix = 'ProseMirror-prompt';

export const openPrompt = (options: any): void => {
    const wrapper = document.body.appendChild(document.createElement('div'));
    wrapper.className = prefix;

    const mouseOutside = (e: any): void => {
        if (!wrapper.contains(e.target)) {
            close();
        }
    };
    setTimeout(() => window.addEventListener('mousedown', mouseOutside), 50);
    const close = (): void => {
        window.removeEventListener('mousedown', mouseOutside);
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    };

    const domFields = [];
    for (const name in options.fields) {
        domFields.push(options.fields[name].render());
    }

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = prefix + '-submit';
    submitButton.textContent = 'OK';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = prefix + '-cancel';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', close);

    const form = wrapper.appendChild(document.createElement('form'));
    if (options.title) {
        form.appendChild(document.createElement('h5')).textContent = options.title;
    }
    domFields.forEach((field: any): void => {
        form.appendChild(document.createElement('div')).appendChild(field);
    });
    const buttons = form.appendChild(document.createElement('div'));
    buttons.className = prefix + '-buttons';
    buttons.appendChild(submitButton);
    buttons.appendChild(document.createTextNode(' '));
    buttons.appendChild(cancelButton);

    const box = wrapper.getBoundingClientRect();
    wrapper.style.top = ((window.innerHeight - box.height) / 2) + 'px';
    wrapper.style.left = ((window.innerWidth - box.width) / 2) + 'px';

    const submit = (): void => {
        const params = getValues(options.fields, domFields);
        if (params) {
            close();
            options.callback(params);
        }
    };

    form.addEventListener('submit', (e: any): void => {
        e.preventDefault();
        submit();
    });

    form.addEventListener('keydown', (e: any): void => {
        if (e.keyCode == 27) {
            e.preventDefault();
            close();
        } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
            e.preventDefault();
            submit();
        } else if (e.keyCode == 9) {
            window.setTimeout(() => {
                if (!wrapper.contains(document.activeElement)) close();
            }, 500);
        }
    });

    const input = form.elements[0];
    if (input) {
        (input as HTMLFormElement).focus();
    }
};

const getValues = (fields: any, domFields: any): any => {
    const result = Object.create(null);
    let i = 0;
    for (const name in fields) {
        const field = fields[name], dom = domFields[i++];
        const value = field.read(dom), bad = field.validate(value);
        if (bad) {
            reportInvalid(dom, bad);
            return null;
        }
        result[name] = field.clean(value);
    }
    return result;
};

const reportInvalid = (dom: any, message: any): void => {
    const parent = dom.parentNode;
    const msg = parent.appendChild(document.createElement('div'));
    msg.style.left = (dom.offsetLeft + dom.offsetWidth + 2) + 'px';
    msg.style.top = (dom.offsetTop - 5) + 'px';
    msg.className = 'ProseMirror-invalid';
    msg.textContent = message;
    setTimeout(() => parent.removeChild(msg), 1500);
};

export class Field {
    protected options: any;
    constructor(options: any) {
        this.options = options;
    }
    public read(dom: any): any {
        return dom.value;
    }
    public validateType(_value: any): any {
        return;
    }
    public validate(value: any): any {
        if (!value && this.options.required) {
            return 'Required field';
        }
        return this.validateType(value) || (this.options.validate && this.options.validate(value));
    }
    public clean(value: any): any {
        return this.options.clean ? this.options.clean(value) : value;
    }
}

export class TextField extends Field {
    constructor(options: any) {
        super(options);
    }
    public render(): any {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = this.options.label;
        input.value = this.options.value || '';
        input.autocomplete = 'off';
        return input;
    }
}

export class SelectField extends Field {
    constructor(options: any) {
        super(options);
    }
    public render(): any {
        const select = document.createElement('select');
        this.options.options.forEach(o => {
            const opt = select.appendChild(document.createElement('option'));
            opt.value = o.value;
            opt.selected = o.value == this.options.value;
            opt.label = o.label;
        });
        return select;
    }
}
