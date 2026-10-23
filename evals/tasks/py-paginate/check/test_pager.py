import os, sys, unittest
sys.path.insert(0, os.getcwd())
from pager import paginate


class Check(unittest.TestCase):
    def test_pages(self):
        items = list(range(10))
        self.assertEqual(paginate(items, 1, 3), [0, 1, 2])
        self.assertEqual(paginate(items, 4, 3), [9])
        self.assertEqual(paginate(items, 5, 3), [])


if __name__ == '__main__':
    unittest.main()
