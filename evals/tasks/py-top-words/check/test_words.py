import os, sys, unittest
sys.path.insert(0, os.getcwd())
from words import top_words


class Check(unittest.TestCase):
    def test_top(self):
        text = 'The cat and the hat. THE end, and fin!'
        self.assertEqual(top_words(text, 2), [('the', 3), ('and', 2)])
        self.assertEqual(top_words(text, 4), [('the', 3), ('and', 2), ('cat', 1), ('end', 1)])
        self.assertEqual(top_words('', 3), [])


if __name__ == '__main__':
    unittest.main()
