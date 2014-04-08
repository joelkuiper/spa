#
#	tokenizers.py
#
#	custom adaptations of the nltk tokenizers to suit scientific article parsing
#

from nltk.tokenize.punkt import *
from functools import wraps
from itertools import izip

class CochraneNLPLanguageVars(PunktLanguageVars):
    _re_non_word_chars   = r"(?:[?!)\";}\]\*:@\'\({\[=\.])" # added =
    """Characters that cannot appear within words"""

    _re_word_start    = r"[^\(\"\`{\[:;&\#\*@\)}\]\-,=]" # added =
    """Excludes some characters from starting word tokens"""

class newPunktWordTokenizer(TokenizerI):
    """
    taken from new version of NLTK 3.0 alpha
    to allow for span tokenization of words (current
    full version does not allow this)
    """
    def __init__(self, lang_vars=CochraneNLPLanguageVars()):
        self._lang_vars = lang_vars
        

    def tokenize(self, text):
        return self._lang_vars.word_tokenize(text)

    def span_tokenize(self, text):
        """
        Given a text, returns a list of the (start, end) spans of words
        in the text.
        """
        return [(sl.start, sl.stop) for sl in self._slices_from_text(text)]

     
    def _slices_from_text(self, text):
        last_break = 0
        contains_no_words = True
        for match in self._lang_vars._word_tokenizer_re().finditer(text):
            contains_no_words = False
            context = match.group()
            yield slice(match.start(), match.end())
        if contains_no_words:
            yield slice(0, 0) # matches PunktSentenceTokenizer's functionality

word_tokenizer = newPunktWordTokenizer()
sent_tokenizer = PunktSentenceTokenizer()

def filters(func):
    """
    used as decorator
    allows pipeline functions to return helpful
    views/permetations of output data - flattened lists
    and filters based on the base (hidden) features
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        
        flatten = kwargs.pop("flatten", False)
        filter = kwargs.pop("filter", None)

        raw_output = func(self, *args, **kwargs)
        if filter:
            filtered_output = [[raw_word for raw_word, base_word in izip(raw_sent, base_sent) if filter(base_word)]
                                for raw_sent, base_sent in izip(raw_output, self.functions)]
        else:
            filtered_output = raw_output

        if flatten:
            return [item for sublist in filtered_output for item in sublist]
        else:
            return filtered_output
    return wrapper


