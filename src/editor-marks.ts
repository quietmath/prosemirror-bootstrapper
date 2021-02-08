export const addMoreMarks = (marks: any): any => {

    marks = marks.update('small_text', {
        parseDOM: [{ tag: 'small' }, { style: 'font-size=small' }],
        toDOM(): any {
            return ['small', 0];
        }
    });

    marks = marks.update('big_text', {
        parseDOM: [{ tag: 'big' }, { style: 'font-size=big' }],
        toDOM(): any {
            return ['big', 0];
        }
    });

    marks = marks.update('underline', {
        parseDOM: [{ tag: 'u' }, { style: 'font-style=italic' }],
        toDOM(): any {
            return ['u', 0];
        }
    });

    marks = marks.update('superscript', {
        parseDOM: [{ tag: 'sup' }],
        toDOM(): any {
            return ['sup', 0];
        }
    });

    marks = marks.update('subscript', {
        parseDOM: [{ tag: 'sub' }],
        toDOM(): any {
            return ['sub', 0];
        }
    });

    marks = marks.update('highlight', {
        parseDOM: [{ tag: 'mark' }],
        toDOM(): any {
            return ['mark', 0];
        }
    });

    return marks;

};
