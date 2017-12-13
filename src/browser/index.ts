
var cmarked =
{
	toString: ( md: string ) => { return TSCommonMark.parse2String( md ); },
	toDOM: ( md: string ) => { return TSCommonMark.parse2DOMTree( md ); },
};

