import os, sys, unittest
sys.path.insert(0, os.getcwd())
from sheet import sum_column


class Check(unittest.TestCase):
    def test_sum(self):
        data = 'name,amount,tax\nA,10,1.5\nB,,2\nC,2.5,\n'
        self.assertEqual(sum_column(data, 'amount'), 12.5)
        self.assertEqual(sum_column(data, 'tax'), 3.5)

    def test_missing(self):
        with self.assertRaises(KeyError):
            sum_column('a,b\n1,2\n', 'c')


if __name__ == '__main__':
    unittest.main()
